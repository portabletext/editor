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
import {getNode} from '../node-traversal/get-node'
import {getValue} from '../node-traversal/get-value'
import type {Node} from '../slate/interfaces/node'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyDeselect} from './apply-selection'
import {isEqualToEmptyEditor} from './values'

/**
 * Creates a function that can apply a patch onto a PortableTextSlateEditor.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (editor: PortableTextSlateEditor, patch: Patch) => boolean {
  return (editor: PortableTextSlateEditor, patch: Patch): boolean => {
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
    PortableTextSlateEditor,
    'children' | 'apply' | 'selection' | 'onChange' | 'schema' | 'containers'
  >,
  patch: DiffMatchPatch,
): boolean {
  const lastSegment = patch.path.at(-1)
  if (lastSegment !== 'text') {
    return false
  }

  const spanPath = patch.path.slice(0, -1)
  const spanEntry = getNode(
    {
      schema: editor.schema,
      containers: editor.containers,
      value: editor.children,
    },
    spanPath,
  )

  if (!spanEntry || !isSpan({schema: editor.schema}, spanEntry.node)) {
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
        type: 'insert_text',
        path: spanEntry.path,
        offset,
        text,
      })
      offset += text.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove_text',
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
  editor: PortableTextSlateEditor,
  patch: InsertPatch,
) {
  const {items, position} = patch

  const editorWasEmptyBefore =
    patch.path.length === 1 &&
    isEqualToEmptyEditor(context.initialValue, editor.children, context.schema)

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
    const removeNode = editor.children[removeIdx]
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
  editor: PortableTextSlateEditor,
  patch: SetPatch | SetIfMissingPatch,
) {
  // For setIfMissing, check if the value at the target path already exists.
  if (patch.type === 'setIfMissing') {
    if (
      patch.path.length === 0
        ? editor.children.length > 0
        : getValue(editor.children, patch.path) !== undefined
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

function unsetPatch(editor: PortableTextSlateEditor, patch: UnsetPatch) {
  if (patch.path.length === 0) {
    applyDeselect(editor)
  }

  editor.apply({type: 'unset', path: patch.path})

  return true
}
