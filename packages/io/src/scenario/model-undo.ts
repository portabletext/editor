import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  applyWithContentLakeSemantics,
  resolvePath,
} from '../protocol/content-lake'
import {extendIo, getIoInternals, type Io} from '../protocol/io'
import {childrenOf, findBlock, isEqual, itemKey, keyOf} from '../protocol/nodes'
import {
  mapOffsetThrough,
  textEditPatch,
  textEditsOf,
} from '../protocol/text-edits'

/**
 * io with the model's undo, a stand-in for the editor's history. `undo`
 * reverts the last of the editor's own changes that undo can still revert,
 * and `getUndoDepth` says how many that is.
 */
export type ModelUndoIo = Io & {
  undo: () => void
  getUndoDepth: () => number
}

/**
 * What a local change did, in terms undo can check against the working copy
 * at undo time: text typed into a span at an offset, a block's style set, a
 * block inserted, or a block deleted next to its siblings. Creating the
 * block from the placeholder isn't part of the step.
 */
type UndoStep =
  | {
      type: 'typed'
      blockKey: string
      spanKey: string
      offset: number
      text: string
    }
  | {type: 'styled'; blockKey: string; style: string}
  | {type: 'inserted'; blockKey: string}
  | {
      type: 'deleted'
      block: PortableTextBlock
      previousKey: string | undefined
      nextKey: string | undefined
    }

/** A block's style, or `undefined` when there is no such block. */
type BlockStyle = {style: string | undefined} | undefined

const placeholderStyle: BlockStyle = {style: 'normal'}

type HistoryEntry = {
  step: UndoStep
  mutationId: string | undefined
  /** How many patches of the entry's mutation come before the action's own. */
  patchOffset: number
  /**
   * The base's version of the step's block just before the change took
   * effect there, captured when the change's transaction applied. `undefined`
   * while the change is unconfirmed.
   */
  confirmed: {blockBefore: PortableTextBlock | undefined} | undefined
}

/**
 * Wraps io with an undo ledger, driven by the editor's local changes and the
 * transactions io applies. io reads nothing from it. Each undo step is read
 * from the local change and the working copy, and its revert is computed
 * against the working copy at undo time. `applyLocalEdit` applies the
 * revert to the editor as the user's own edit, which the editor reports as
 * a local `change`, or refuses while read-only.
 */
export function withModelUndo(
  io: Io,
  applyLocalEdit: (patches: Array<Patch>) => void,
): ModelUndoIo {
  const internals = getIoInternals(io)
  let history: Array<HistoryEntry> = []
  let reverting: {applied: boolean} | undefined

  internals.tap({
    localChange: ({operations, workingCopyBefore, patchOffset}) => {
      mapStepsThrough(operations, workingCopyBefore, [])

      if (reverting) {
        reverting.applied = true
        return
      }

      const step = undoStepOf(operations, workingCopyBefore)

      if (step) {
        history = [
          ...history,
          {step, mutationId: undefined, patchOffset, confirmed: undefined},
        ]
      }
    },
    mutation: (id) => {
      history = history.map((entry) =>
        entry.mutationId === undefined ? {...entry, mutationId: id} : entry,
      )
    },
    transaction: ({confirmedMutationIds, patches, valueBefore, ownPatches}) => {
      captureBlocksBefore(confirmedMutationIds)
      mapStepsThrough(patches, valueBefore, ownPatches)
    },
    resync: () => {
      history = []
    },
  })

  /**
   * Moves each typing step's offset past the text that `patches` inserted or
   * deleted before it in its span, applying them to `valueBefore` in turn.
   * `ownPatches` are the editor's own and move no step: its own work was in
   * the working copy already.
   */
  function mapStepsThrough(
    patches: Array<Patch>,
    valueBefore: Array<PortableTextBlock> | undefined,
    ownPatches: Array<Patch>,
  ) {
    const unmatchedOwnPatches = [...ownPatches]
    let value = valueBefore

    for (const patch of patches) {
      const ownIndex = unmatchedOwnPatches.findIndex((ownPatch) =>
        isEqual(ownPatch, patch),
      )
      const text = resolvePath(value, patch.path)

      if (ownIndex !== -1) {
        unmatchedOwnPatches.splice(ownIndex, 1)
      } else if (patch.type === 'diffMatchPatch' && typeof text === 'string') {
        const edits = textEditsOf(patch.value, text)

        history = history.map((entry) =>
          entry.step.type === 'typed' &&
          isEqual(patch.path, typedPath(entry.step))
            ? {
                ...entry,
                step: {
                  ...entry.step,
                  offset: mapOffsetThrough(entry.step.offset, edits),
                },
              }
            : entry,
        )
      }

      try {
        value = applyWithContentLakeSemantics(value, [patch])
      } catch {
        return
      }
    }
  }

  /** Runs before the base takes the transaction that confirms the mutations. */
  function captureBlocksBefore(confirmedMutationIds: Set<string>) {
    history = history.map((entry) =>
      entry.mutationId !== undefined &&
      confirmedMutationIds.has(entry.mutationId)
        ? {...entry, confirmed: {blockBefore: blockUnder(entry)}}
        : entry,
    )
  }

  /**
   * The step's block in the base with the editor's own unconfirmed changes
   * from before the action applied: what the action changed, as far as the
   * base goes.
   */
  function blockUnder(entry: HistoryEntry): PortableTextBlock | undefined {
    const {base, unconfirmed, pending} = internals.getLayers()
    const mutations = [...unconfirmed, {id: undefined, patches: pending}]
    const mutationIndex = mutations.findIndex(
      (mutation) => mutation.id === entry.mutationId,
    )

    if (mutationIndex === -1) {
      return undefined
    }

    const patchesBefore = [
      ...mutations
        .slice(0, mutationIndex)
        .flatMap((mutation) => mutation.patches),
      ...mutations[mutationIndex].patches.slice(0, entry.patchOffset),
    ]

    return findBlock(
      applyWithContentLakeSemantics(base, patchesBefore),
      stepBlockKey(entry.step),
    )
  }

  /**
   * The editor applies the revert as a local change, which books it. A
   * read-only editor refuses it, and the step stays.
   */
  function undo() {
    const status = internals.getStatus()

    if (status === 'unmounted') {
      internals.warn('Ignored an undo after the editor unmounted')
      return
    }

    if (status !== 'ready') {
      throw new Error(`The editor is ${status}`)
    }

    const entry = history.at(-1)

    if (!entry) {
      return
    }

    history = history.slice(0, -1)

    const patches = revert(entry)

    if (patches.length === 0) {
      return
    }

    const attempt = {applied: false}
    reverting = attempt

    try {
      applyLocalEdit(patches)
    } finally {
      reverting = undefined
    }

    if (!attempt.applied) {
      history = [...history, entry]
    }
  }

  function revert(entry: HistoryEntry): Array<Patch> {
    const {step} = entry
    const screen = internals.getWorkingCopy() ?? []

    switch (step.type) {
      case 'typed':
        return deleteTyped(screen, step)
      case 'styled': {
        const block = findBlock(screen, step.blockKey)

        if (block === undefined) {
          return []
        }

        const restored = styleToRestore(entry, step, block)
        const path = [{_key: step.blockKey}, 'style']

        if (restored === undefined || block.style === restored.style) {
          return []
        }

        return [
          restored.style === undefined
            ? unset(path)
            : set(restored.style, path),
        ]
      }
      case 'inserted':
        return deleteBlockByKey(screen, step.blockKey)
      case 'deleted': {
        const block = entry.confirmed
          ? entry.confirmed.blockBefore
          : blockUnder(entry)

        return block === undefined ? [] : restoreBlock(screen, {...step, block})
      }
    }
  }

  /**
   * Once the change is confirmed, a style in the working copy other than the
   * one it set means another writer changed the style after it, and undo
   * leaves it. The working copy, not the base alone, since the editor's own
   * later changes are undone first and may still be unconfirmed. A block the
   * base didn't have before the change came from the placeholder in the same
   * action, so its style before the change is the placeholder's.
   */
  function styleToRestore(
    entry: HistoryEntry,
    step: Extract<UndoStep, {type: 'styled'}>,
    screenBlock: PortableTextBlock,
  ): BlockStyle {
    if (!entry.confirmed) {
      return styleOf(blockUnder(entry)) ?? placeholderStyle
    }

    return styleOf(screenBlock)?.style === step.style
      ? (styleOf(entry.confirmed.blockBefore) ?? placeholderStyle)
      : undefined
  }

  return extendIo(io, {undo, getUndoDepth: () => history.length})
}

/**
 * What undo needs to revert a local change, read from its operations and the
 * working copy before it. Typing, a style, an insert and a delete are steps,
 * and deleting text isn't. A text operation that inserts one run of text is
 * typing, at the offset the operation names.
 */
function undoStepOf(
  patches: Array<Patch>,
  screenBefore: Array<PortableTextBlock> | undefined,
): UndoStep | undefined {
  const fromPlaceholder = createsBlock(patches)
  const value = applyWithContentLakeSemantics(
    screenBefore,
    fromPlaceholder ? patches.slice(0, 2) : [],
  )
  const [patch] = fromPlaceholder ? patches.slice(2) : patches
  const [head, field, spanSegment] = patch?.path ?? []
  const blockKey = keyOf(head)

  if (!patch || blockKey === undefined) {
    return undefined
  }

  if (
    patch.type === 'set' &&
    patch.path.length === 2 &&
    field === 'style' &&
    typeof patch.value === 'string'
  ) {
    return {type: 'styled', blockKey, style: patch.value}
  }

  if (patch.type === 'insert' && patch.path.length === 1) {
    const [insertedKey] = patch.items.flatMap((item) => itemKey(item))

    return insertedKey === undefined
      ? undefined
      : {type: 'inserted', blockKey: insertedKey}
  }

  if (patch.type === 'unset' && patch.path.length === 1) {
    const blocks = value ?? []
    const index = blocks.findIndex((block) => block._key === blockKey)

    return index === -1
      ? undefined
      : {
          type: 'deleted',
          block: blocks[index],
          previousKey: blocks[index - 1]?._key,
          nextKey: blocks[index + 1]?._key,
        }
  }

  const spanKey = keyOf(spanSegment)
  const text = resolvePath(value, patch.path)

  if (
    patch.type !== 'diffMatchPatch' ||
    patch.path.length !== 4 ||
    spanKey === undefined ||
    typeof text !== 'string'
  ) {
    return undefined
  }

  const edits = textEditsOf(patch.value, text)
  const [edit] = edits

  return edits.length === 1 && edit.type === 'insert'
    ? {type: 'typed', blockKey, spanKey, offset: edit.offset, text: edit.text}
    : undefined
}

/**
 * Whether a change turns the placeholder into content: it starts with a
 * whole-field `setIfMissing` followed by an `insert`.
 */
function createsBlock(patches: Array<Patch>): boolean {
  const [first, second] = patches

  return (
    first?.type === 'setIfMissing' &&
    first.path.length === 0 &&
    second?.type === 'insert'
  )
}

/**
 * Removes typed text from its span, at the occurrence nearest its offset.
 * Returns no patches when the span no longer holds the text.
 */
function deleteTyped(
  value: Array<PortableTextBlock>,
  typed: Extract<UndoStep, {type: 'typed'}>,
): Array<Patch> {
  const block = findBlock(value, typed.blockKey)
  const span = block
    ? childrenOf(block).find((child) => itemKey(child)[0] === typed.spanKey)
    : undefined
  const text: unknown =
    typeof span === 'object' && span !== null
      ? Reflect.get(span, 'text')
      : undefined

  if (typeof text !== 'string') {
    return []
  }

  const typedOffset = findNearest(text, typed.text, typed.offset)

  if (typedOffset === undefined) {
    return []
  }

  return [
    textEditPatch(
      text,
      {offset: typedOffset, deleteLength: typed.text.length},
      typedPath(typed),
    ),
  ]
}

function typedPath(typed: Extract<UndoStep, {type: 'typed'}>): Patch['path'] {
  return [{_key: typed.blockKey}, 'children', {_key: typed.spanKey}, 'text']
}

/**
 * Removes a block, and the field with it when it was the last. Returns no
 * patches when the block is gone.
 */
function deleteBlockByKey(
  value: Array<PortableTextBlock>,
  blockKey: string,
): Array<Patch> {
  if (findBlock(value, blockKey) === undefined) {
    return []
  }

  return value.length === 1
    ? [unset([{_key: blockKey}]), unset([])]
    : [unset([{_key: blockKey}])]
}

/**
 * Puts a deleted block back after its previous sibling, or else before its
 * next one, or else first. An empty field gets the block as its content.
 * Returns no patches when the block's key is in the working copy.
 */
function restoreBlock(
  value: Array<PortableTextBlock>,
  deleted: Extract<UndoStep, {type: 'deleted'}>,
): Array<Patch> {
  const {block} = deleted

  if (findBlock(value, block._key) !== undefined) {
    return []
  }

  if (value.length === 0) {
    return [setIfMissing([], []), insert([block], 'before', [0])]
  }

  if (
    deleted.previousKey !== undefined &&
    findBlock(value, deleted.previousKey) !== undefined
  ) {
    return [insert([block], 'after', [{_key: deleted.previousKey}])]
  }

  const reference =
    deleted.nextKey !== undefined &&
    findBlock(value, deleted.nextKey) !== undefined
      ? deleted.nextKey
      : value[0]._key

  return [insert([block], 'before', [{_key: reference}])]
}

/**
 * The start of the occurrence of `search` in `text` nearest `offset`, looking
 * after the offset first at each distance.
 */
function findNearest(
  text: string,
  search: string,
  offset: number,
): number | undefined {
  for (
    let distance = 0;
    distance <= Math.max(offset, text.length);
    distance++
  ) {
    for (const candidate of [offset + distance, offset - distance]) {
      if (candidate >= 0 && text.startsWith(search, candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

function stepBlockKey(step: UndoStep): string {
  return step.type === 'deleted' ? step.block._key : step.blockKey
}

function styleOf(block: PortableTextBlock | undefined): BlockStyle {
  if (!block) {
    return undefined
  }

  const style: unknown = block.style

  return {style: typeof style === 'string' ? style : undefined}
}
