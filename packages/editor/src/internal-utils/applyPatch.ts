import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextChild,
} from '@portabletext/schema'
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
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import type {Node} from '../slate/interfaces/node'
import type {Path as SlatePath} from '../slate/interfaces/path'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {applyDeselect} from './apply-selection'
import {isEqualToEmptyEditor, toSlateBlock} from './values'

function insertNodesSequentially(
  editor: Pick<PortableTextSlateEditor, 'apply'>,
  nodes: Array<Node>,
  anchorPath: SlatePath,
  position: 'before' | 'after',
  parentPath: SlatePath,
): void {
  nodes.forEach((node, index) => {
    if (index === 0) {
      editor.apply({type: 'insert_node', path: anchorPath, node, position})
    } else {
      const previousNode = nodes[index - 1]!
      editor.apply({
        type: 'insert_node',
        path: [...parentPath, {_key: previousNode._key}],
        node,
        position: 'after',
      })
    }
  })
}

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
  const block = findBlock(editor.children, patch.path)

  if (!block) {
    if (patch.path.length === 1 && patch.path[0] === 0) {
      const blocksToInsert = patch.items.map((item) =>
        toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
      )

      insertNodesSequentially(editor, blocksToInsert, [0], 'before', [])

      return true
    }

    return false
  }

  if (patch.path.length > 1 && patch.path[1] !== 'children') {
    return false
  }

  // Insert blocks
  if (patch.path.length === 1) {
    const {items, position} = patch
    const blocksToInsert = items.map((item) =>
      toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
    )
    const targetBlockIndex = block.index

    const editorWasEmptyBefore = isEqualToEmptyEditor(
      context.initialValue,
      editor.children,
      context.schema,
    )

    insertNodesSequentially(
      editor,
      blocksToInsert,
      [{_key: block.node._key}],
      position === 'after' ? 'after' : 'before',
      [],
    )

    if (
      editorWasEmptyBefore &&
      typeof patch.path[0] === 'number' &&
      patch.path[0] === 0
    ) {
      const removeIdx =
        position === 'before'
          ? targetBlockIndex + blocksToInsert.length
          : targetBlockIndex
      const removeNode = editor.children[removeIdx]
      if (!removeNode) {
        return false
      }
      const removeEntry = getNode(editor, [{_key: removeNode._key}])
      if (!removeEntry) {
        return false
      }
      editor.apply({
        type: 'remove_node',
        path: [{_key: removeEntry.node._key}],
        node: removeEntry.node,
      })
    }

    return true
  }

  // Insert children
  const {items, position} = patch

  const targetChild = findBlockChild(block, patch.path, editor.schema)

  if (!targetChild) {
    return false
  }

  const childrenToInsert = toSlateBlock(
    {...block.node, children: items as PortableTextChild[]},
    {schemaTypes: context.schema},
  )

  if (
    childrenToInsert &&
    isTextBlock({schema: editor.schema}, childrenToInsert)
  ) {
    insertNodesSequentially(
      editor,
      childrenToInsert.children,
      [{_key: block.node._key}, 'children', {_key: targetChild.node._key}],
      position === 'after' ? 'after' : 'before',
      [{_key: block.node._key}, 'children'],
    )
  }

  return true
}

function setPatch(
  editor: PortableTextSlateEditor,
  patch: SetPatch | SetIfMissingPatch,
) {
  // setIfMissing at root is a noop when the editor already has content
  if (
    patch.type === 'setIfMissing' &&
    patch.path.length === 0 &&
    editor.children.length > 0
  ) {
    return false
  }

  // For setIfMissing, check if the value at the target path already exists
  if (patch.type === 'setIfMissing' && patch.path.length > 0) {
    const block = findBlock(editor.children, patch.path)
    if (block) {
      // Walk the remaining path (after the block segment) to check existence
      let current: unknown = block.node
      for (let i = 1; i < patch.path.length; i++) {
        const segment = patch.path[i]
        if (current === null || current === undefined) {
          break
        }
        if (typeof segment === 'string') {
          current = (current as Record<string, unknown>)[segment]
        } else if (isKeyedSegment(segment)) {
          if (!Array.isArray(current)) {
            current = undefined
            break
          }
          current = (current as Array<Record<string, unknown>>).find(
            (item) => item['_key'] === segment._key,
          )
        } else if (typeof segment === 'number') {
          if (!Array.isArray(current)) {
            current = undefined
            break
          }
          current = (current as Array<unknown>)[segment]
        }
      }
      if (current !== undefined) {
        return false
      }
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
  // Value unset (path [])
  if (patch.path.length === 0) {
    applyDeselect(editor)

    const children = getChildren(editor, [])

    for (let index = children.length - 1; index >= 0; index--) {
      const entry = children[index]
      if (!entry) {
        continue
      }
      const {node, path: nodePath} = entry
      editor.apply({
        type: 'remove_node',
        path: nodePath,
        node,
      })
    }

    return true
  }

  // Check if the path ends at a keyed segment (structural: removing a node)
  const lastSegment = patch.path.at(-1)

  if (lastSegment === undefined) {
    return false
  }

  // Removing a node (block or child): structural operation
  if (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') {
    const nodeEntry = getNode(editor, patch.path)

    if (!nodeEntry) {
      return false
    }

    editor.apply({
      type: 'remove_node',
      path: nodeEntry.path,
      node: nodeEntry.node,
    })

    return true
  }

  // Property unset: pass through to the apply layer
  editor.apply({
    type: 'unset',
    path: patch.path,
  })

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
