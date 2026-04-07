import {
  applyAll,
  type DiffMatchPatch,
  type InsertPatch,
  type Patch,
  type SetIfMissingPatch,
  type SetPatch,
  type UnsetPatch,
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
import {pathRef} from '../slate/editor/path-ref'
import type {Node} from '../slate/interfaces/node'
import type {Path as SlatePath} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {applyDeselect, applySelect} from './apply-selection'
import {applySetNode} from './apply-set-node'
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
  let value = patch.value

  // Full value replacement (path [])
  if (patch.path.length === 0) {
    if (!Array.isArray(value)) {
      return false
    }

    // setIfMissing at root is a noop when the editor already has content
    if (patch.type === 'setIfMissing' && editor.children.length > 0) {
      return false
    }

    const previousSelection = editor.selection

    // Remove all existing blocks in reverse order
    for (let i = editor.children.length - 1; i >= 0; i--) {
      const node = editor.children[i]
      if (node) {
        editor.apply({
          type: 'remove_node',
          path: [{_key: node._key}],
          node,
        })
      }
    }

    // Insert the new blocks
    let previousInsertedBlock: Node | undefined
    for (const block of value) {
      const node = block as Node
      if (previousInsertedBlock) {
        editor.apply({
          type: 'insert_node',
          path: [{_key: previousInsertedBlock._key}],
          node,
          position: 'after',
        })
      } else {
        editor.apply({
          type: 'insert_node',
          path: [0],
          node,
          position: 'before',
        })
      }
      previousInsertedBlock = node
    }

    // Restore the selection if it's still valid
    if (previousSelection) {
      applySelect(editor, previousSelection)
    }

    return true
  }

  if (typeof patch.path[3] === 'string') {
    value = {}
    value[patch.path[3]] = patch.value
  }

  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  const blockIsTextBlock = isTextBlock({schema: editor.schema}, block.node)

  if (patch.path.length === 1) {
    const updatedBlock = applyAll(block.node, [
      {
        ...patch,
        path: patch.path.slice(1),
      },
    ])

    if (
      isTextBlock({schema: editor.schema}, block.node) &&
      isTextBlock({schema: editor.schema}, updatedBlock)
    ) {
      applySetNode(editor, updatedBlock, [{_key: block.node._key}])

      const previousSelection = editor.selection

      // Remove the previous children in reverse order (highest index first)
      const children = getChildren(editor, [{_key: block.node._key}])

      const childPaths = Array.from(children.reverse(), (entry) =>
        pathRef(editor, entry.path),
      )
      for (const pathRef of childPaths) {
        const childPath = pathRef.unref()!
        if (childPath) {
          const childNodeEntry = getNode(editor, childPath)
          if (!childNodeEntry) {
            continue
          }
          editor.apply({
            type: 'remove_node',
            path: childPath,
            node: childNodeEntry.node,
          })
        }
      }

      // Insert the new children
      insertNodesSequentially(
        editor,
        updatedBlock.children,
        [{_key: block.node._key}, 'children', 0],
        'before',
        [{_key: block.node._key}, 'children'],
      )

      // Restore the selection
      if (previousSelection) {
        applySelect(editor, previousSelection)
      }

      return true
    } else {
      applySetNode(editor, updatedBlock, [{_key: block.node._key}])

      return true
    }
  }

  if (
    blockIsTextBlock &&
    (patch.path.length === 2 || patch.path[1] !== 'children')
  ) {
    const updatedBlock = applyAll(block.node, [
      {
        ...patch,
        path: patch.path.slice(1),
      },
    ])

    applySetNode(editor, updatedBlock, [{_key: block.node._key}])

    return true
  }

  const child = findBlockChild(block, patch.path, editor.schema)

  // If this is targeting a text block child
  if (blockIsTextBlock && child) {
    if (isSpan({schema: editor.schema}, child.node)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        'text' in value &&
        typeof value['text'] === 'string'
      ) {
        if (patch.type === 'setIfMissing') {
          return false
        }

        const oldText = child.node.text
        const newText = value['text'] as string
        if (oldText !== newText) {
          editor.apply({
            type: 'remove_text',
            path: [
              {_key: block.node._key},
              'children',
              {_key: child.node._key},
            ],
            offset: 0,
            text: oldText,
          })
          editor.apply({
            type: 'insert_text',
            path: [
              {_key: block.node._key},
              'children',
              {_key: child.node._key},
            ],
            offset: 0,
            text: newText,
          })
          // call OnChange here to emit the new selection
          // the user's selection might be interfering with
          editor.onChange()
        }
      } else {
        // Setting non-text span property

        const propPath = patch.path.slice(3)
        const propEntry = propPath.at(0)
        const reservedProps = ['_key', '_type', 'text']

        if (propEntry === undefined) {
          return false
        }

        if (
          typeof propEntry === 'string' &&
          reservedProps.includes(propEntry)
        ) {
          return false
        }

        const newNode = applyAll(child.node, [
          {
            ...patch,
            path: propPath,
          },
        ])

        applySetNode(editor, newNode, [
          {_key: block.node._key},
          'children',
          {_key: child.node._key},
        ])
      }
    } else {
      // Setting inline object property

      const propPath = patch.path.slice(3)
      const reservedProps = ['_key', '_type', 'children']
      const propEntry = propPath.at(0)

      if (propEntry === undefined) {
        return false
      }

      if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
        return false
      }

      const newNode = applyAll(child.node, [
        {
          ...patch,
          path: patch.path.slice(3),
        },
      ])

      applySetNode(editor, newNode, [
        {_key: block.node._key},
        'children',
        {_key: child.node._key},
      ])
    }

    return true
  } else if (block && !blockIsTextBlock) {
    if (patch.path.length > 1 && patch.path[1] !== 'children') {
      const newVal = applyAll(block.node, [
        {
          ...patch,
          path: patch.path.slice(1),
        },
      ])

      applySetNode(editor, newVal, [{_key: block.node._key}])
    } else {
      return false
    }
  }

  return true
}

function unsetPatch(editor: PortableTextSlateEditor, patch: UnsetPatch) {
  // Value
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

  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  // Single blocks
  if (patch.path.length === 1) {
    const blockNodeEntry = getNode(editor, [{_key: block.node._key}])
    if (!blockNodeEntry) {
      return false
    }
    editor.apply({
      type: 'remove_node',
      path: [{_key: blockNodeEntry.node._key}],
      node: blockNodeEntry.node,
    })

    return true
  }

  const child = findBlockChild(block, patch.path, editor.schema)

  // Unset on text block children
  if (isTextBlock({schema: editor.schema}, block.node) && child) {
    if (patch.path[1] === 'children' && patch.path.length === 3) {
      const childNodeEntry2 = getNode(editor, [
        {_key: block.node._key},
        'children',
        {_key: child.node._key},
      ])
      if (!childNodeEntry2) {
        return false
      }
      editor.apply({
        type: 'remove_node',
        path: [
          {_key: block.node._key},
          'children',
          {_key: childNodeEntry2.node._key},
        ],
        node: childNodeEntry2.node,
      })

      return true
    }
  }

  if (
    child &&
    (isTextBlock({schema: editor.schema}, child.node) ||
      isObjectNode({schema: editor.schema}, child.node))
  ) {
    // Unsetting inline object property

    const propPath = patch.path.slice(3)
    const propEntry = propPath.at(0)
    const reservedProps = ['_key', '_type', 'children']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
      return false
    }

    const newNode = applyAll(child.node, [
      {
        ...patch,
        path: patch.path.slice(3),
      },
    ])
    const newKeys = Object.keys(newNode)

    const removedProperties = Object.keys(child.node).filter(
      (property) => !newKeys.includes(property),
    )

    if (removedProperties.length > 0) {
      const unsetProps: Record<string, null> = {}
      for (const prop of removedProperties) {
        unsetProps[prop] = null
      }
      applySetNode(editor, unsetProps, [
        {_key: block.node._key},
        'children',
        {_key: child.node._key},
      ])
    } else {
      applySetNode(editor, newNode, [
        {_key: block.node._key},
        'children',
        {_key: child.node._key},
      ])
    }

    return true
  }

  if (child && isSpan({schema: editor.schema}, child.node)) {
    const propPath = patch.path.slice(3)
    const propEntry = propPath.at(0)
    const reservedProps = ['_key', '_type']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
      return false
    }

    if (typeof propEntry === 'string' && propEntry === 'text') {
      editor.apply({
        type: 'remove_text',
        path: [{_key: block.node._key}, 'children', {_key: child.node._key}],
        offset: 0,
        text: child.node.text,
      })

      return true
    }

    const newNode = applyAll(child.node, [
      {
        ...patch,
        path: propPath,
      },
    ])
    const newKeys = Object.keys(newNode)

    const removedProperties = Object.keys(child.node).filter(
      (property) => !newKeys.includes(property),
    )

    const unsetProps: Record<string, null> = {}
    for (const prop of removedProperties) {
      unsetProps[prop] = null
    }
    applySetNode(editor, unsetProps, [
      {_key: block.node._key},
      'children',
      {_key: child.node._key},
    ])

    return true
  }

  if (!child) {
    if (!isTextBlock({schema: editor.schema}, block.node)) {
      const newVal = applyAll(block.node, [
        {
          ...patch,
          path: patch.path.slice(1),
        },
      ])
      const newKeys = Object.keys(newVal)

      const removedProperties = Object.keys(block.node).filter(
        (property) => !newKeys.includes(property),
      )

      if (removedProperties.length > 0) {
        const unsetProps: Record<string, null> = {}
        for (const prop of removedProperties) {
          unsetProps[prop] = null
        }
        applySetNode(editor, unsetProps, [{_key: block.node._key}])
      } else {
        applySetNode(editor, newVal, [{_key: block.node._key}])
      }

      return true
    }

    if (isTextBlock({schema: editor.schema}, block.node)) {
      const propPath = patch.path.slice(1)
      const propEntry = propPath.at(0)
      const reservedProps = ['_key', '_type', 'children']

      if (propEntry === undefined) {
        return false
      }

      if (typeof propEntry !== 'string') {
        return false
      }

      if (reservedProps.includes(propEntry)) {
        return false
      }

      if (propPath.length === 1) {
        applySetNode(editor, {[propEntry]: null}, [{_key: block.node._key}])
      } else {
        const updatedBlock = applyAll(block.node, [
          {
            ...patch,
            path: propPath,
          },
        ]) as unknown as Record<string, unknown>

        applySetNode(editor, {[propEntry]: updatedBlock[propEntry]}, [
          {_key: block.node._key},
        ])
      }

      return true
    }

    return false
  }

  return false
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
