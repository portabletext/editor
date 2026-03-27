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
import type {EditorContext} from '../editor/editor-snapshot'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {pathRef} from '../slate/editor/path-ref'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyDeselect, applySelect} from './apply-selection'
import {applySetNode} from './apply-set-node'
import {resolveNodePath} from './resolve-node-path'
import {isEqualToEmptyEditor, toSlateBlock} from './values'

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
    | 'children'
    | 'apply'
    | 'selection'
    | 'onChange'
    | 'schema'
    | 'blockIndexMap'
    | 'editableTypes'
    | 'value'
  >,
  patch: DiffMatchPatch,
): boolean {
  const nodePath = resolveNodePath(editor, patch.path)

  if (!nodePath) {
    return false
  }

  const {indexedPath, propertyPath} = nodePath

  // Must target the 'text' property of a span
  if (propertyPath.length !== 1 || propertyPath.at(0) !== 'text') {
    return false
  }

  const nodeEntry = getNode(editor, indexedPath)

  if (!nodeEntry) {
    return false
  }

  if (!isSpan({schema: editor.schema}, nodeEntry.node)) {
    return false
  }

  // Verify the parent is a text block
  const parentPath = indexedPath.slice(0, -1)
  if (parentPath.length > 0) {
    const parentEntry = getNode(editor, parentPath)
    if (
      !parentEntry ||
      !isTextBlock({schema: editor.schema}, parentEntry.node)
    ) {
      return false
    }
  }

  const patches = parsePatch(patch.value)
  const [newValue] = diffMatchPatchApplyPatches(patches, nodeEntry.node.text, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(nodeEntry.node.text, newValue), 5)

  let offset = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      editor.apply({
        type: 'insert_text',
        path: indexedPath,
        offset,
        text,
      })
      offset += text.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove_text',
        path: indexedPath,
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
  const nodePath = resolveNodePath(editor, patch.path)

  if (!nodePath) {
    // Handle numeric path for inserting blocks (e.g., path: [0])
    const firstSegment = patch.path.at(0)
    if (patch.path.length === 1 && typeof firstSegment === 'number') {
      const targetBlock = editor.children.at(firstSegment)

      if (!targetBlock) {
        // No block at this index - insert at position 0
        const blocksToInsert = patch.items.map((item) =>
          toSlateBlock(item as PortableTextBlock, {
            schemaTypes: context.schema,
          }),
        )

        blocksToInsert.forEach((node, index) => {
          editor.apply({type: 'insert_node', path: [index], node})
        })

        return true
      }

      // Block exists at this index - insert relative to it
      const {items, position} = patch
      const blocksToInsert = items.map((item) =>
        toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
      )
      const normalizedIndex =
        position === 'after' ? firstSegment + 1 : firstSegment

      const editorWasEmptyBefore = isEqualToEmptyEditor(
        context.initialValue,
        editor.children,
        context.schema,
      )

      blocksToInsert.forEach((node, index) => {
        editor.apply({
          type: 'insert_node',
          path: [normalizedIndex + index],
          node,
        })
      })

      if (editorWasEmptyBefore && firstSegment === 0) {
        const removeIndex =
          position === 'before'
            ? firstSegment + blocksToInsert.length
            : firstSegment
        const removeEntry = getNode(editor, [removeIndex])
        if (!removeEntry) {
          return false
        }
        editor.apply({
          type: 'remove_node',
          path: [removeIndex],
          node: removeEntry.node,
        })
      }

      return true
    }

    return false
  }

  const {indexedPath, propertyPath} = nodePath

  // Insert blocks at top level: path points to a top-level block, no property path
  if (indexedPath.length === 1 && propertyPath.length === 0) {
    const {items, position} = patch
    const blocksToInsert = items.map((item) =>
      toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
    )
    const targetBlockIndex = indexedPath.at(0)!
    const normalizedIndex =
      position === 'after' ? targetBlockIndex + 1 : targetBlockIndex

    const editorWasEmptyBefore = isEqualToEmptyEditor(
      context.initialValue,
      editor.children,
      context.schema,
    )

    blocksToInsert.forEach((node, index) => {
      editor.apply({
        type: 'insert_node',
        path: [normalizedIndex + index],
        node,
      })
    })

    if (
      editorWasEmptyBefore &&
      typeof patch.path.at(0) === 'number' &&
      patch.path.at(0) === 0
    ) {
      const removeIndex =
        position === 'before'
          ? targetBlockIndex + blocksToInsert.length
          : targetBlockIndex
      const removeEntry = getNode(editor, [removeIndex])
      if (!removeEntry) {
        return false
      }
      editor.apply({
        type: 'remove_node',
        path: [removeIndex],
        node: removeEntry.node,
      })
    }

    return true
  }

  // Insert children into a text block (at any depth)
  if (propertyPath.length === 0 && indexedPath.length >= 2) {
    const {items, position} = patch

    const targetIndex = indexedPath.at(-1)!
    const parentPath = indexedPath.slice(0, -1)

    const parentEntry = getNode(editor, parentPath)

    if (!parentEntry) {
      return false
    }

    // If the parent is a text block, we're inserting children
    if (isTextBlock({schema: editor.schema}, parentEntry.node)) {
      const normalizedIndex =
        position === 'after' ? targetIndex + 1 : targetIndex

      const childrenToInsert = toSlateBlock(
        {...parentEntry.node, children: items as PortableTextChild[]},
        {schemaTypes: context.schema},
      )

      if (
        childrenToInsert &&
        isTextBlock({schema: editor.schema}, childrenToInsert)
      ) {
        childrenToInsert.children.forEach((node: Node, index: number) => {
          editor.apply({
            type: 'insert_node',
            path: [...parentPath, normalizedIndex + index],
            node,
          })
        })
      }

      return true
    }

    const normalizedIndex = position === 'after' ? targetIndex + 1 : targetIndex

    const blocksToInsert = items.map((item) =>
      toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
    )

    blocksToInsert.forEach((node, index) => {
      editor.apply({
        type: 'insert_node',
        path: [...parentPath, normalizedIndex + index],
        node,
      })
    })

    return true
  }

  return false
}

function setPatch(
  editor: PortableTextSlateEditor,
  patch: SetPatch | SetIfMissingPatch,
) {
  const nodePath = resolveNodePath(editor, patch.path)

  if (!nodePath) {
    return false
  }

  const {indexedPath, propertyPath} = nodePath

  const nodeEntry = getNode(editor, indexedPath)

  if (!nodeEntry) {
    return false
  }

  // Setting a property on a block (no property path, or property path targeting block-level props)
  const isBlock =
    isTextBlock({schema: editor.schema}, nodeEntry.node) ||
    isObjectNode({schema: editor.schema}, nodeEntry.node)

  if (isBlock && propertyPath.length === 0) {
    const updatedBlock = applyAll(nodeEntry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])

    if (
      isTextBlock({schema: editor.schema}, nodeEntry.node) &&
      isTextBlock({schema: editor.schema}, updatedBlock)
    ) {
      applySetNode(editor, updatedBlock, indexedPath)

      const previousSelection = editor.selection

      // Remove the previous children in reverse order (highest index first)
      const children = getChildren(editor, indexedPath)

      const childPaths = Array.from(children.reverse(), (entry) =>
        pathRef(editor, entry.path),
      )
      for (const childPathRef of childPaths) {
        const childPath = childPathRef.unref()!
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
      updatedBlock.children.forEach((node: Node, index: number) => {
        editor.apply({
          type: 'insert_node',
          path: [...indexedPath, index],
          node,
        })
      })

      // Restore the selection
      if (previousSelection) {
        applySelect(editor, previousSelection)
      }

      return true
    } else {
      applySetNode(editor, updatedBlock, indexedPath)

      return true
    }
  }

  // Setting a block-level property (e.g., style, markDefs)
  if (isBlock && propertyPath.length > 0) {
    const firstProp = propertyPath.at(0)
    if (typeof firstProp === 'string' && firstProp !== 'children') {
      const updatedBlock = applyAll(nodeEntry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ])

      applySetNode(editor, updatedBlock, indexedPath)

      return true
    }
  }

  // Setting properties on a child node (span or inline object) at any depth
  if (indexedPath.length >= 2 && propertyPath.length > 0) {
    if (isSpan({schema: editor.schema}, nodeEntry.node)) {
      const firstProp = propertyPath.at(0)

      if (firstProp === undefined) {
        return false
      }

      // Handle text property
      if (firstProp === 'text') {
        if (patch.type === 'setIfMissing') {
          return false
        }

        if (typeof patch.value === 'string') {
          const oldText = nodeEntry.node.text
          if (oldText !== patch.value) {
            editor.apply({
              type: 'remove_text',
              path: indexedPath,
              offset: 0,
              text: oldText,
            })
            editor.apply({
              type: 'insert_text',
              path: indexedPath,
              offset: 0,
              text: patch.value,
            })
            editor.onChange()
          }
        }

        return true
      }

      // Setting non-text span property
      const reservedProps = ['_key', '_type', 'text']

      if (typeof firstProp === 'string' && reservedProps.includes(firstProp)) {
        return false
      }

      const newNode = applyAll(nodeEntry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ])

      applySetNode(editor, newNode, indexedPath)

      return true
    }

    // Setting inline object or other node property
    const reservedProps = ['_key', '_type', 'children']
    const firstProp = propertyPath.at(0)

    if (firstProp === undefined) {
      return false
    }

    if (typeof firstProp === 'string' && reservedProps.includes(firstProp)) {
      return false
    }

    const newNode = applyAll(nodeEntry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])

    applySetNode(editor, newNode, indexedPath)

    return true
  }

  // Setting properties on a child node with no property path (full replacement)
  if (indexedPath.length >= 2 && propertyPath.length === 0) {
    const value = patch.value

    // If the target is a span and the value contains text, handle text replacement
    if (
      isSpan({schema: editor.schema}, nodeEntry.node) &&
      value !== null &&
      typeof value === 'object' &&
      'text' in value &&
      typeof value['text'] === 'string'
    ) {
      if (patch.type === 'setIfMissing') {
        return false
      }

      const oldText = nodeEntry.node.text
      const newText = value['text']
      if (oldText !== newText) {
        editor.apply({
          type: 'remove_text',
          path: indexedPath,
          offset: 0,
          text: oldText,
        })
        editor.apply({
          type: 'insert_text',
          path: indexedPath,
          offset: 0,
          text: newText,
        })
        editor.onChange()
      }

      const newNode = applyAll(nodeEntry.node, [
        {
          ...patch,
          path: [],
        },
      ])
      applySetNode(editor, newNode, indexedPath)

      return true
    }

    if (
      patch.value !== null &&
      typeof patch.value === 'object' &&
      !Array.isArray(patch.value)
    ) {
      applySetNode(editor, patch.value, indexedPath)
    }
    return true
  }

  return true
}

function unsetPatch(editor: PortableTextSlateEditor, patch: UnsetPatch) {
  // Value
  if (patch.path.length === 0) {
    applyDeselect(editor)

    const children = getChildren(editor, [])

    for (let index = children.length - 1; index >= 0; index--) {
      const entry = children.at(index)
      if (!entry) {
        continue
      }
      const {node, path: nodePath} = entry
      editor.apply({type: 'remove_node', path: nodePath, node})
    }

    return true
  }

  const nodePath = resolveNodePath(editor, patch.path)

  if (!nodePath) {
    return false
  }

  const {indexedPath, propertyPath} = nodePath

  const nodeEntry = getNode(editor, indexedPath)

  if (!nodeEntry) {
    return false
  }

  // Unset a node (remove it from its parent)
  if (propertyPath.length === 0) {
    editor.apply({
      type: 'remove_node',
      path: indexedPath,
      node: nodeEntry.node,
    })

    return true
  }

  // Unset a property on a node
  if (propertyPath.length > 0) {
    const firstProp = propertyPath.at(0)

    if (firstProp === undefined) {
      return false
    }

    if (isSpan({schema: editor.schema}, nodeEntry.node)) {
      const reservedProps = ['_key', '_type']

      if (typeof firstProp === 'string' && reservedProps.includes(firstProp)) {
        return false
      }

      if (typeof firstProp === 'string' && firstProp === 'text') {
        editor.apply({
          type: 'remove_text',
          path: indexedPath,
          offset: 0,
          text: nodeEntry.node.text,
        })

        return true
      }

      const newNode = applyAll(nodeEntry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ])
      const newKeys = Object.keys(newNode)

      const removedProperties = Object.keys(nodeEntry.node).filter(
        (property) => !newKeys.includes(property),
      )

      const unsetProps: Record<string, null> = {}
      for (const prop of removedProperties) {
        unsetProps[prop] = null
      }
      applySetNode(editor, unsetProps, indexedPath)

      return true
    }

    if (
      isTextBlock({schema: editor.schema}, nodeEntry.node) ||
      isObjectNode({schema: editor.schema}, nodeEntry.node)
    ) {
      const reservedProps = ['_key', '_type', 'children']

      if (typeof firstProp === 'string' && reservedProps.includes(firstProp)) {
        return false
      }

      const newNode = applyAll(nodeEntry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ])
      const newKeys = Object.keys(newNode)

      const removedProperties = Object.keys(nodeEntry.node).filter(
        (property) => !newKeys.includes(property),
      )

      if (removedProperties.length > 0) {
        const unsetProps: Record<string, null> = {}
        for (const prop of removedProperties) {
          unsetProps[prop] = null
        }
        applySetNode(editor, unsetProps, indexedPath)
      } else {
        applySetNode(editor, newNode, indexedPath)
      }

      return true
    }

    // Handle block property unset for text blocks
    if (isTextBlock({schema: editor.schema}, nodeEntry.node)) {
      const reservedProps = ['_key', '_type', 'children']

      if (typeof firstProp !== 'string') {
        return false
      }

      if (reservedProps.includes(firstProp)) {
        return false
      }

      if (propertyPath.length === 1) {
        applySetNode(editor, {[firstProp]: null}, indexedPath)
      } else {
        const updatedBlock = applyAll(nodeEntry.node, [
          {
            ...patch,
            path: propertyPath,
          },
        ])

        const updatedValue = updatedBlock[firstProp]
        applySetNode(editor, {[firstProp]: updatedValue}, indexedPath)
      }

      return true
    }

    // Non-text block property unset
    const newVal = applyAll(nodeEntry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])
    const newKeys = Object.keys(newVal)

    const removedProperties = Object.keys(nodeEntry.node).filter(
      (property) => !newKeys.includes(property),
    )

    if (removedProperties.length > 0) {
      const unsetProps: Record<string, null> = {}
      for (const prop of removedProperties) {
        unsetProps[prop] = null
      }
      applySetNode(editor, unsetProps, indexedPath)
    } else {
      applySetNode(editor, newVal, indexedPath)
    }

    return true
  }

  return false
}
