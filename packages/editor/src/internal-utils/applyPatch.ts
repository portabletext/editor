import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {isSpan, type PortableTextBlock} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import {getNode} from '../traversal/get-node'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {applyDeselect} from './apply-selection'
import {getValue} from './get-value'
import {
  getPendingLocalTextEditsKey,
  mapOffsetThroughLocalEdits,
  pruneStaleLocalTextEdits,
  reconstructTextBeforeLocalEdits,
} from './pending-local-text-edits'
import {isEqualToEmptyEditor} from './values'

/**
 * Creates a function that can apply a patch onto a PortableTextEditorEngine.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (editor: PortableTextEditorEngine, patch: Patch) => boolean {
  return (editor: PortableTextEditorEngine, patch: Patch): boolean => {
    let changed = false

    try {
      switch (patch.type) {
        case 'insert':
          changed = insertPatch(context, editor, patch)
          break
        case 'unset':
          changed = unsetPatch(editor, patch)
          break
        case 'set':
          changed = setPatch(editor, patch)
          break
        case 'setIfMissing':
          changed = setPatch(editor, patch)
          break
        case 'diffMatchPatch':
          changed = diffMatchPatch(editor, patch)
          break
      }
    } catch (err) {
      console.error(err)
    }

    return changed
  }
}

function diffMatchPatch(
  editor: Pick<
    PortableTextEditorEngine,
    'apply' | 'onChange' | 'containers' | 'snapshot' | 'pendingLocalTextEdits'
  >,
  patch: DiffMatchPatch,
): boolean {
  const lastSegment = patch.path.at(-1)
  if (lastSegment !== 'text') {
    // Diffing tools also emit `diffMatchPatch` for strings outside span
    // text, e.g. `span.marks[0]` when a decorator is swapped. Resolve the
    // current string, apply the diff, and set the result.
    const currentValue = getValue(editor.snapshot.context.value, patch.path)
    if (typeof currentValue !== 'string') {
      return false
    }

    const [newValue] = diffMatchPatchApplyPatches(
      parsePatch(patch.value),
      currentValue,
      {allowExceedingIndices: true},
    )

    editor.apply({
      type: 'set',
      path: patch.path,
      value: newValue,
    })

    return true
  }

  const spanPath = patch.path.slice(0, -1)
  const spanEntry = getNode(editor.snapshot, spanPath)

  if (
    !spanEntry ||
    !isSpan({schema: editor.snapshot.context.schema}, spanEntry.node)
  ) {
    return false
  }

  const now = Date.now()
  const pendingLocalEdits = pruneStaleLocalTextEdits(
    editor.pendingLocalTextEdits.get(
      getPendingLocalTextEditsKey(spanEntry.path),
    ) ?? [],
    now,
  )

  // The common case: no recent local edit to this span, so the live text
  // is exactly what the remote diff was computed against. Apply it as-is.
  if (pendingLocalEdits.length === 0) {
    const patches = parsePatch(patch.value)
    const [newValue] = diffMatchPatchApplyPatches(
      patches,
      spanEntry.node.text,
      {allowExceedingIndices: true},
    )
    const diff = cleanupEfficiency(makeDiff(spanEntry.node.text, newValue), 5)

    let offset = 0
    for (const [op, text] of diff) {
      if (op === DIFF_INSERT) {
        editor.apply({
          type: 'insert.text',
          path: spanEntry.path,
          offset,
          text,
        })
        offset += text.length
      } else if (op === DIFF_DELETE) {
        editor.apply({
          type: 'remove.text',
          path: spanEntry.path,
          offset,
          text,
        })
      } else if (op === DIFF_EQUAL) {
        offset += text.length
      }
    }

    return true
  }

  // This span has local, unflushed edits sitting on top of the text the
  // remote diff was computed against. Fuzzy-match and diff against the
  // text as it stood *before* those local edits, then map each resulting
  // change's offset forward through them, rather than fuzzy-matching
  // against the live text directly — which would find wherever the
  // remote's context happens to match inside the local edit and splice the
  // remote content into the middle of it.
  const textBeforeLocalEdits = reconstructTextBeforeLocalEdits(
    spanEntry.node.text,
    pendingLocalEdits,
  )
  const patches = parsePatch(patch.value)
  const [newValue] = diffMatchPatchApplyPatches(patches, textBeforeLocalEdits, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(textBeforeLocalEdits, newValue), 5)

  let offset = 0
  let remoteShiftSoFar = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      const liveOffset =
        mapOffsetThroughLocalEdits(offset, pendingLocalEdits, now) +
        remoteShiftSoFar
      editor.apply({
        type: 'insert.text',
        path: spanEntry.path,
        offset: liveOffset,
        text,
      })
      offset += text.length
      remoteShiftSoFar += text.length
    } else if (op === DIFF_DELETE) {
      const liveOffset =
        mapOffsetThroughLocalEdits(offset, pendingLocalEdits, now) +
        remoteShiftSoFar
      editor.apply({
        type: 'remove.text',
        path: spanEntry.path,
        offset: liveOffset,
        text,
      })
      remoteShiftSoFar -= text.length
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }

  return true
}

function insertPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
  editor: PortableTextEditorEngine,
  patch: InsertPatch,
) {
  const {items, position} = patch

  const editorWasEmptyBefore =
    patch.path.length === 1 &&
    isEqualToEmptyEditor(
      context.initialValue,
      editor.snapshot.context.value,
      context.schema,
    )

  const arrayFieldPath = patch.path.slice(0, -1)

  for (let index = 0; index < items.length; index++) {
    if (index === 0) {
      editor.apply({
        type: 'insert',
        path: patch.path,
        node: items[index] as Node,
        position: position === 'after' ? 'after' : 'before',
      })
    } else {
      const previousItem = items[index - 1]! as Record<string, unknown>
      const previousKey =
        typeof previousItem['_key'] === 'string'
          ? previousItem['_key']
          : undefined

      if (previousKey !== undefined) {
        editor.apply({
          type: 'insert',
          path: [...arrayFieldPath, {_key: previousKey}],
          node: items[index] as Node,
          position: 'after',
        })
      } else {
        const lastSegment = patch.path.at(-1)!
        const baseIndex = typeof lastSegment === 'number' ? lastSegment : 0
        const offset = position === 'after' ? 1 : 0
        const numericIndex = baseIndex + offset + index
        editor.apply({
          type: 'insert',
          path: [...arrayFieldPath, numericIndex],
          node: items[index] as Node,
          position: 'before',
        })
      }
    }
  }

  if (editorWasEmptyBefore && typeof patch.path[0] === 'number') {
    const removeIdx = position === 'before' ? items.length : 0
    const removeNode = editor.snapshot.context.value[removeIdx]
    if (removeNode) {
      editor.apply({
        type: 'unset',
        path: [{_key: removeNode._key}],
      })
    }
  }

  return true
}

function setPatch(
  editor: PortableTextEditorEngine,
  patch: SetPatch | SetIfMissingPatch,
) {
  // For setIfMissing, check if the value at the target path already exists.
  if (patch.type === 'setIfMissing') {
    if (
      patch.path.length === 0
        ? editor.snapshot.context.value.length > 0
        : getValue(editor.snapshot.context.value, patch.path) !== undefined
    ) {
      return false
    }
  }

  editor.apply({
    type: 'set',
    path: patch.path,
    value: patch.value,
  })

  return true
}

function unsetPatch(editor: PortableTextEditorEngine, patch: UnsetPatch) {
  if (patch.path.length === 0) {
    applyDeselect(editor)
  }

  editor.apply({type: 'unset', path: patch.path})

  return true
}
