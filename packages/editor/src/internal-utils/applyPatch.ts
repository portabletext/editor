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
import {isEqualValues} from './equality'
import {getValue} from './get-value'
import {isEqualToEmptyEditor} from './values'

/**
 * Creates a function that can apply a patch onto a PortableTextEditorEngine.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (editor: PortableTextEditorEngine, patch: Patch) => boolean {
  return (editor: PortableTextEditorEngine, incomingPatch: Patch): boolean => {
    const patch = resolveNegativeIndexes(
      editor.snapshot.context.value,
      incomingPatch,
    )

    if (!patch) {
      return false
    }

    let changed = false

    try {
      switch (patch.type) {
        case 'insert':
          changed = insertPatch(
            context,
            editor,
            patch,
            typeof incomingPatch.path[0] === 'number',
          )
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

/**
 * Like Sanity, a negative index counts from the end of the array its
 * segment selects in, against the value just before the patch. Returns
 * `undefined` when a negative index falls before the start of its array,
 * since the patch then addresses nothing.
 */
function resolveNegativeIndexes(
  value: Array<PortableTextBlock>,
  patch: Patch,
): Patch | undefined {
  if (
    patch.type !== 'set' &&
    patch.type !== 'unset' &&
    !(patch.type === 'insert' && patch.items.length === 1)
  ) {
    return patch
  }

  if (!patch.path.some((segment) => isNegativeIndex(segment))) {
    return patch
  }

  const path: Path = []
  let current: unknown = value

  for (const [segmentIndex, segment] of patch.path.entries()) {
    if (
      patch.type === 'insert' &&
      segment === -1 &&
      segmentIndex === patch.path.length - 1 &&
      Array.isArray(current) &&
      current.length === 0
    ) {
      // Like Sanity, an insert at -1 into an empty array inserts its items,
      // whatever the position.
      return {...patch, path: [...path, 0], position: 'before'}
    }

    if (isNegativeIndex(segment)) {
      if (!Array.isArray(current) || current.length + segment < 0) {
        return undefined
      }

      const index = current.length + segment
      const element: unknown = current[index]
      const key =
        typeof element === 'object' && element !== null && '_key' in element
          ? element['_key']
          : undefined

      // The rest of the editor resolves keyed segments at any depth, while a
      // numeric segment below the root is not always found.
      path.push(typeof key === 'string' ? {_key: key} : index)
      current = element
    } else {
      path.push(segment)
      current = getValue(current, [segment])
    }
  }

  if (patch.type === 'insert' && patch.position === 'replace') {
    return patch
  }

  return {...patch, path}
}

function isNegativeIndex(segment: Path[number]): segment is number {
  return typeof segment === 'number' && segment < 0
}

function diffMatchPatch(
  editor: Pick<
    PortableTextEditorEngine,
    'apply' | 'onChange' | 'containers' | 'snapshot'
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

    return editor.apply({
      type: 'set',
      path: patch.path,
      value: newValue,
    })
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
  const [newValue] = diffMatchPatchApplyPatches(patches, spanEntry.node.text, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(spanEntry.node.text, newValue), 5)

  let changed = false
  let offset = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      changed =
        editor.apply({
          type: 'insert.text',
          path: spanEntry.path,
          offset,
          text,
        }) || changed
      offset += text.length
    } else if (op === DIFF_DELETE) {
      changed =
        editor.apply({
          type: 'remove.text',
          path: spanEntry.path,
          offset,
          text,
        }) || changed
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }

  return changed
}

function insertPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
  editor: PortableTextEditorEngine,
  patch: InsertPatch,
  addressedByRootIndex: boolean,
) {
  const {items, position} = patch

  const editorWasEmptyBefore =
    patch.path.length === 1 &&
    isEqualToEmptyEditor(
      context.initialValue,
      editor.snapshot.context.value,
      context.schema,
    ) &&
    (editor.valueUnsetEmitted ||
      // Mirrors `editorWasEmpty` in `subscriber.patch-generation.ts`: once
      // this editor's stream has unset the field, a value-equal recording
      // is not proof of persistence.
      !isEqualValues(
        {schema: context.schema},
        editor.lastSyncedValue,
        editor.snapshot.context.value,
      ))

  const arrayFieldPath = patch.path.slice(0, -1)
  let changed = false

  for (let index = 0; index < items.length; index++) {
    if (index === 0) {
      changed =
        editor.apply({
          type: 'insert',
          path: patch.path,
          node: items[index] as Node,
          position: position === 'after' ? 'after' : 'before',
        }) || changed
    } else {
      const previousItem = items[index - 1]! as Record<string, unknown>
      const previousKey =
        typeof previousItem['_key'] === 'string'
          ? previousItem['_key']
          : undefined

      if (previousKey !== undefined) {
        changed =
          editor.apply({
            type: 'insert',
            path: [...arrayFieldPath, {_key: previousKey}],
            node: items[index] as Node,
            position: 'after',
          }) || changed
      } else {
        const lastSegment = patch.path.at(-1)!
        const baseIndex = typeof lastSegment === 'number' ? lastSegment : 0
        const offset = position === 'after' ? 1 : 0
        const numericIndex = baseIndex + offset + index
        changed =
          editor.apply({
            type: 'insert',
            path: [...arrayFieldPath, numericIndex],
            node: items[index] as Node,
            position: 'before',
          }) || changed
      }
    }
  }

  if (changed && editorWasEmptyBefore && addressedByRootIndex) {
    const removeIdx = position === 'before' ? items.length : 0
    const removeNode = editor.snapshot.context.value[removeIdx]
    if (removeNode) {
      editor.apply({
        type: 'unset',
        path: [{_key: removeNode._key}],
      })
    }
  }

  return changed
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

  return editor.apply({
    type: 'set',
    path: patch.path,
    value: patch.value,
  })
}

function unsetPatch(editor: PortableTextEditorEngine, patch: UnsetPatch) {
  if (patch.path.length === 0) {
    applyDeselect(editor)
  }

  return editor.apply({type: 'unset', path: patch.path})
}
