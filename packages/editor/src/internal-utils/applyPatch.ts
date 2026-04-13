import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getValue} from '../node-traversal/get-value'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
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
    'children' | 'apply' | 'selection' | 'onChange' | 'schema'
  >,
  patch: DiffMatchPatch,
): boolean {
  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  const child = findBlockChild(block, patch.path, editor.schema)

  if (!child) {
    return false
  }

  const isSpanTextDiffMatchPatch =
    block &&
    isTextBlock({schema: editor.schema}, block.node) &&
    patch.path.length === 4 &&
    patch.path[1] === 'children' &&
    patch.path[3] === 'text'

  if (
    !isSpanTextDiffMatchPatch ||
    !isSpan({schema: editor.schema}, child.node)
  ) {
    return false
  }

  const patches = parsePatch(patch.value)
  const [newValue] = diffMatchPatchApplyPatches(patches, child.node.text, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(child.node.text, newValue), 5)

  let offset = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      editor.apply({
        type: 'insert_text',
        path: [{_key: block.node._key}, 'children', {_key: child.node._key}],
        offset,
        text,
      })
      offset += text.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove_text',
        path: [{_key: block.node._key}, 'children', {_key: child.node._key}],
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

function findBlock(
  children: Node[],
  path: Path,
): {node: Node; index: number} | undefined {
  let blockIndex = -1

  const block = children.find((node: Node, index: number) => {
    const isMatch = isKeyedSegment(path[0])
      ? node._key === path[0]._key
      : index === path[0]

    if (isMatch) {
      blockIndex = index
    }

    return isMatch
  })

  if (!block) {
    return undefined
  }

  return {node: block, index: blockIndex}
}

function findBlockChild(
  block: {node: Node; index: number},
  path: Path,
  schema: EditorSchema,
): {node: Node; index: number} | undefined {
  const blockNode = block.node

  if (!isTextBlock({schema}, blockNode) || path[1] !== 'children') {
    return undefined
  }

  let childIndex = -1

  const child = blockNode.children.find((node: Node, index: number) => {
    const isMatch = isKeyedSegment(path[2])
      ? node._key === path[2]._key
      : index === path[2]

    if (isMatch) {
      childIndex = index
    }

    return isMatch
  })

  if (!child) {
    return undefined
  }

  return {
    node: child,
    index: childIndex,
  }
}
