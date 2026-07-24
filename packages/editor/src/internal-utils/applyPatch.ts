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
import type {Path} from '../types/paths'
import {applyDeselect} from './apply-selection'
import {getValue} from './get-value'
import {
  getPendingLocalTextEditsKey,
  pruneStaleLocalTextEdits,
  type PendingLocalTextEdit,
} from './pending-local-text-edits'
import {applyPatchesStrictly, mergeSpanText} from './span-text-merge'
import {isEqualToEmptyEditor} from './values'

type ApplyPatchOptions = {
  snapshot?: Array<PortableTextBlock>
}

/**
 * Creates a function that can apply a patch onto a PortableTextEditorEngine.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (
  editor: PortableTextEditorEngine,
  patch: Patch,
  options?: ApplyPatchOptions,
) => boolean {
  return (
    editor: PortableTextEditorEngine,
    patch: Patch,
    options: ApplyPatchOptions = {},
  ): boolean => {
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
          changed = diffMatchPatch(editor, patch, options.snapshot)
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
  snapshot: Array<PortableTextBlock> | undefined,
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

    const patches = parsePatch(patch.value)
    const [newValue, results] = diffMatchPatchApplyPatches(
      patches,
      currentValue,
      {allowExceedingIndices: true},
    )

    if (
      results.length === 0 ||
      results.some((result) => !result) ||
      newValue === currentValue
    ) {
      return false
    }

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

  const patches = parsePatch(patch.value)
  if (patches.length === 0) {
    return false
  }

  pruneStaleLocalTextEdits(editor.pendingLocalTextEdits, Date.now())

  const pendingLocalEditKey = getPendingLocalTextEditsKey(spanEntry.path)
  const pendingLocalEdit = editor.pendingLocalTextEdits.get(pendingLocalEditKey)
  const liveText = spanEntry.node.text

  if (!pendingLocalEdit) {
    const strictLiveApplication = applyPatchesStrictly(patches, liveText)
    const newValue =
      strictLiveApplication?.text ?? applyFuzzyPatches(patches, liveText)
    return newValue === undefined
      ? false
      : applyTextValue(editor, spanEntry.path, liveText, newValue)
  }

  const strictBaseApplication = applyPatchesStrictly(
    patches,
    pendingLocalEdit.baseText,
  )
  const strictLiveApplication = applyPatchesStrictly(patches, liveText)

  if (strictBaseApplication) {
    const mergedText = mergeSpanText(
      pendingLocalEdit.baseText,
      liveText,
      strictBaseApplication.text,
    )
    updatePendingLocalTextEdit(
      editor.pendingLocalTextEdits,
      pendingLocalEditKey,
      pendingLocalEdit,
      strictBaseApplication.text,
      mergedText,
    )
    return applyTextValue(editor, spanEntry.path, liveText, mergedText)
  }

  if (strictLiveApplication) {
    editor.pendingLocalTextEdits.delete(pendingLocalEditKey)
    return applyTextValue(
      editor,
      spanEntry.path,
      liveText,
      strictLiveApplication.text,
    )
  }

  const baseApplication = applyFuzzyPatches(patches, pendingLocalEdit.baseText)
  const liveApplication = applyFuzzyPatches(patches, liveText)
  const baseCandidate = baseApplication
    ? {
        source: 'base' as const,
        text: mergeSpanText(
          pendingLocalEdit.baseText,
          liveText,
          baseApplication,
        ),
        remoteText: baseApplication,
      }
    : undefined
  const liveCandidate = liveApplication
    ? {source: 'live' as const, text: liveApplication}
    : undefined
  const snapshotText = getValue(snapshot, patch.path)
  const candidate = selectPatchCandidate(
    baseCandidate,
    liveCandidate,
    typeof snapshotText === 'string' ? snapshotText : undefined,
  )

  if (!candidate) {
    editor.pendingLocalTextEdits.delete(pendingLocalEditKey)
    return false
  }

  if (candidate.source === 'base') {
    updatePendingLocalTextEdit(
      editor.pendingLocalTextEdits,
      pendingLocalEditKey,
      pendingLocalEdit,
      candidate.remoteText,
      candidate.text,
    )
  } else {
    editor.pendingLocalTextEdits.delete(pendingLocalEditKey)
  }

  return applyTextValue(editor, spanEntry.path, liveText, candidate.text)
}

function applyFuzzyPatches(
  patches: ReturnType<typeof parsePatch>,
  text: string,
): string | undefined {
  const [newText, results] = diffMatchPatchApplyPatches(patches, text, {
    allowExceedingIndices: true,
  })

  return results.length > 0 && results.every(Boolean) ? newText : undefined
}

function applyTextValue(
  editor: Pick<PortableTextEditorEngine, 'apply'>,
  path: Path,
  currentText: string,
  nextText: string,
): boolean {
  if (currentText === nextText) {
    return false
  }

  const diff = cleanupEfficiency(makeDiff(currentText, nextText), 5)
  let offset = 0

  for (const [operation, text] of diff) {
    if (operation === DIFF_INSERT) {
      editor.apply({type: 'insert.text', path, offset, text})
      offset += text.length
    } else if (operation === DIFF_DELETE) {
      editor.apply({type: 'remove.text', path, offset, text})
    } else if (operation === DIFF_EQUAL) {
      offset += text.length
    }
  }

  return true
}

function selectPatchCandidate(
  baseCandidate: {source: 'base'; text: string; remoteText: string} | undefined,
  liveCandidate: {source: 'live'; text: string} | undefined,
  snapshotText: string | undefined,
):
  | {source: 'base'; text: string; remoteText: string}
  | {source: 'live'; text: string}
  | undefined {
  if (!baseCandidate) {
    return liveCandidate
  }
  if (!liveCandidate) {
    return baseCandidate
  }
  if (baseCandidate.text === liveCandidate.text) {
    return baseCandidate
  }
  if (snapshotText === baseCandidate.text) {
    return baseCandidate
  }
  if (snapshotText === liveCandidate.text) {
    return liveCandidate
  }

  return baseCandidate.text < liveCandidate.text ? baseCandidate : liveCandidate
}

function updatePendingLocalTextEdit(
  edits: PortableTextEditorEngine['pendingLocalTextEdits'],
  key: string,
  edit: PendingLocalTextEdit,
  remoteText: string,
  mergedText: string,
): void {
  if (remoteText === mergedText) {
    edits.delete(key)
  } else {
    edit.baseText = remoteText
  }
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
