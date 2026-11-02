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
import type {PathSegment} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
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
  const [newValue] = diffMatchPatchApplyPatches(patches, spanEntry.node.text, {
    allowExceedingIndices: true,
  })
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
  const arrayField = getValue(editor.snapshot.context.value, arrayFieldPath)

  if (
    Array.isArray(arrayField) &&
    !isInsertSelectorValid(arrayField, patch.path.at(-1))
  ) {
    return false
  }

  const arrayFieldWasEmpty =
    Array.isArray(arrayField) && arrayField.length === 0

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
        if (arrayFieldWasEmpty) {
          // The selector is `[0]` or `[-1]`, and like `arrayInsert` in
          // `@portabletext/patches`, an empty array then takes the items as
          // they are, whatever the position. A sidecar array goes through
          // `@portabletext/patches`, where `before` an index equal to the
          // length addresses nothing.
          editor.apply({
            type: 'insert',
            path: [...arrayFieldPath, index - 1],
            node: items[index] as Node,
            position: 'after',
          })
          continue
        }

        const lastSegment = patch.path.at(-1)!
        const baseIndex = typeof lastSegment === 'number' ? lastSegment : 0
        const offset = position === 'after' ? 1 : 0
        editor.apply({
          type: 'insert',
          path: [...arrayFieldPath, baseIndex + offset + index],
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

/**
 * Mirrors `@portabletext/patches`, which applies all of an insert's items or
 * none: the selector must address an existing item (`findTargetIndex`),
 * except that an empty array also takes `[0]` and `[-1]`.
 */
function isInsertSelectorValid(
  array: Array<unknown>,
  selector: PathSegment | undefined,
): boolean {
  if (typeof selector === 'number') {
    if (array.length === 0) {
      return selector === 0 || selector === -1
    }
    const index = selector < 0 ? array.length + selector : selector
    return index >= 0 && index < array.length
  }

  if (isKeyedSegment(selector)) {
    return array.some(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        (item as Record<string, unknown>)['_key'] === selector._key,
    )
  }

  return false
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
