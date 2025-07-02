import {
  applyAll,
  type DiffMatchPatch,
  type InsertPatch,
  type Patch,
  type SetPatch,
  type UnsetPatch,
} from '@portabletext/patches'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import type {Path, PortableTextBlock, PortableTextChild} from '@sanity/types'
import {Element, Node, Text, Transforms, type Descendant} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import type {PortableTextSlateEditor} from '../types/editor'
import {isKeyedSegment} from '../utils'
import {isEqualToEmptyEditor, toSlateValue} from './values'
import {KEY_TO_SLATE_ELEMENT} from './weakMaps'

/**
 * Creates a function that can apply a patch onto a PortableTextSlateEditor.
 */
export function createApplyPatch(
  schema: EditorSchema,
): (editor: PortableTextSlateEditor, patch: Patch) => boolean {
  return (editor: PortableTextSlateEditor, patch: Patch): boolean => {
    let changed = false

    try {
      switch (patch.type) {
        case 'insert':
          changed = insertPatch(editor, patch, schema)
          break
        case 'unset':
          changed = unsetPatch(editor, patch)
          break
        case 'set':
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
    'children' | 'isTextBlock' | 'apply' | 'selection' | 'onChange'
  >,
  patch: DiffMatchPatch,
): boolean {
  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  const child = findBlockChild(block, patch.path)

  if (!child) {
    return false
  }

  const isSpanTextDiffMatchPatch =
    block &&
    editor.isTextBlock(block.node) &&
    patch.path.length === 4 &&
    patch.path[1] === 'children' &&
    patch.path[3] === 'text'

  if (!isSpanTextDiffMatchPatch || !Text.isText(child.node)) {
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
        path: [block.index, child.index],
        offset,
        text,
      })
      offset += text.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove_text',
        path: [block.index, child.index],
        offset: offset,
        text,
      })
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }

  return true
}

function insertPatch(
  editor: PortableTextSlateEditor,
  patch: InsertPatch,
  schema: EditorSchema,
) {
  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  if (patch.path.length > 1 && patch.path[1] !== 'children') {
    return false
  }

  // Insert blocks
  if (patch.path.length === 1) {
    const {items, position} = patch
    const blocksToInsert = toSlateValue(
      items as PortableTextBlock[],
      {schemaTypes: schema},
      KEY_TO_SLATE_ELEMENT.get(editor),
    ) as Descendant[]
    const targetBlockIndex = block.index
    const normalizedIdx =
      position === 'after' ? targetBlockIndex + 1 : targetBlockIndex

    const editorWasEmptyBefore = isEqualToEmptyEditor(editor.children, schema)

    Transforms.insertNodes(editor, blocksToInsert, {at: [normalizedIdx]})

    if (
      editorWasEmptyBefore &&
      typeof patch.path[0] === 'number' &&
      patch.path[0] === 0
    ) {
      Transforms.removeNodes(editor, {
        at: [position === 'before' ? targetBlockIndex + 1 : targetBlockIndex],
      })
    }

    return true
  }

  // Insert children
  const {items, position} = patch

  const targetChild = findBlockChild(block, patch.path)

  if (!targetChild) {
    return false
  }

  const childrenToInsert = toSlateValue(
    [{...block.node, children: items as PortableTextChild[]}],
    {schemaTypes: schema},
    KEY_TO_SLATE_ELEMENT.get(editor),
  )
  const normalizedIdx =
    position === 'after' ? targetChild.index + 1 : targetChild.index
  const childInsertPath = [block.index, normalizedIdx]

  if (childrenToInsert && Element.isElement(childrenToInsert[0])) {
    Transforms.insertNodes(editor, childrenToInsert[0].children, {
      at: childInsertPath,
    })
  }

  return true
}

function setPatch(editor: PortableTextSlateEditor, patch: SetPatch) {
  let value = patch.value
  if (typeof patch.path[3] === 'string') {
    value = {}
    value[patch.path[3]] = patch.value
  }

  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  const isTextBlock = editor.isTextBlock(block.node)

  // Ignore patches targeting nested void data, like 'markDefs'
  if (isTextBlock && patch.path.length > 1 && patch.path[1] !== 'children') {
    return false
  }

  const child = findBlockChild(block, patch.path)

  // If this is targeting a text block child
  if (isTextBlock && child) {
    if (Text.isText(child.node)) {
      if (Text.isText(value)) {
        const oldText = child.node.text
        const newText = value.text
        if (oldText !== newText) {
          editor.apply({
            type: 'remove_text',
            path: [block.index, child.index],
            offset: 0,
            text: oldText,
          })
          editor.apply({
            type: 'insert_text',
            path: [block.index, child.index],
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

        Transforms.setNodes(editor, newNode, {at: [block.index, child.index]})
      }
    } else {
      // Setting inline object property

      const propPath = patch.path.slice(3)
      const reservedProps = ['_key', '_type', 'children', '__inline']
      const propEntry = propPath.at(0)

      if (propEntry === undefined) {
        return false
      }

      if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
        return false
      }

      // If the child is an inline object, we need to apply the patch to the
      // `value` property object.
      const value =
        'value' in child.node && typeof child.node.value === 'object'
          ? child.node.value
          : {}

      const newValue = applyAll(value, [
        {
          ...patch,
          path: patch.path.slice(3),
        },
      ])

      Transforms.setNodes(
        editor,
        {...child.node, value: newValue},
        {at: [block.index, child.index]},
      )
    }

    return true
  } else if (Element.isElement(block.node) && patch.path.length === 1) {
    const {children, ...nextRest} = value as unknown as PortableTextBlock
    const {children: prevChildren, ...prevRest} = block.node || {
      children: undefined,
    }

    // Set any block properties
    editor.apply({
      type: 'set_node',
      path: [block.index],
      properties: {...prevRest},
      newProperties: nextRest,
    })

    // Replace the children in the block
    // Note that children must be explicitly inserted, and can't be set with set_node
    const blockNode = block.node

    blockNode.children.forEach((child, childIndex) => {
      editor.apply({
        type: 'remove_node',
        path: [block.index, blockNode.children.length - 1 - childIndex],
        node: child,
      })
    })

    if (Array.isArray(children)) {
      children.forEach((child, childIndex) => {
        editor.apply({
          type: 'insert_node',
          path: [block.index, childIndex],
          node: child,
        })
      })
    }
  } else if (block && 'value' in block.node) {
    if (patch.path.length > 1 && patch.path[1] !== 'children') {
      const newVal = applyAll(block.node.value, [
        {
          ...patch,
          path: patch.path.slice(1),
        },
      ])

      Transforms.setNodes(
        editor,
        {...block.node, value: newVal},
        {at: [block.index]},
      )
    } else {
      return false
    }
  }

  return true
}

function unsetPatch(editor: PortableTextSlateEditor, patch: UnsetPatch) {
  // Value
  if (patch.path.length === 0) {
    const previousSelection = editor.selection
    Transforms.deselect(editor)

    const children = Node.children(editor, [], {
      reverse: true,
    })

    for (const [_, path] of children) {
      Transforms.removeNodes(editor, {at: path})
    }

    Transforms.insertNodes(editor, editor.pteCreateTextBlock({decorators: []}))
    if (previousSelection) {
      Transforms.select(editor, {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 0},
      })
    }
    // call OnChange here to emit the new selection
    editor.onChange()
    return true
  }

  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  // Single blocks
  if (patch.path.length === 1) {
    if (editor.children.length === 1) {
      // `unset`ing the last block should be treated similar to `unset`ing the
      // entire editor value
      const previousSelection = editor.selection

      Transforms.deselect(editor)
      Transforms.removeNodes(editor, {at: [block.index]})
      Transforms.insertNodes(
        editor,
        editor.pteCreateTextBlock({decorators: []}),
      )

      if (previousSelection) {
        Transforms.select(editor, {
          anchor: {path: [0, 0], offset: 0},
          focus: {path: [0, 0], offset: 0},
        })
      }

      editor.onChange()

      return true
    }

    Transforms.removeNodes(editor, {at: [block.index]})

    return true
  }

  const child = findBlockChild(block, patch.path)

  // Unset on text block children
  if (editor.isTextBlock(block.node) && child) {
    if (patch.path[1] === 'children' && patch.path.length === 3) {
      Transforms.removeNodes(editor, {at: [block.index, child.index]})

      return true
    }
  }

  if (child && !Text.isText(child.node)) {
    // Unsetting inline object property

    const propPath = patch.path.slice(3)
    const propEntry = propPath.at(0)
    const reservedProps = ['_key', '_type', 'children', '__inline']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
      // All custom properties are stored on the `value` property object.
      // If you try to unset any of the other top-level properties it's a
      // no-op.
      return false
    }

    const value =
      'value' in child.node && typeof child.node.value === 'object'
        ? child.node.value
        : {}

    const newValue = applyAll(value, [
      {
        ...patch,
        path: patch.path.slice(3),
      },
    ])

    Transforms.setNodes(
      editor,
      {...child.node, value: newValue},
      {at: [block.index, child.index]},
    )

    return true
  }

  if (child && Text.isText(child.node)) {
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
        path: [block.index, child.index],
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

    Transforms.unsetNodes(editor, removedProperties, {
      at: [block.index, child.index],
    })

    return true
  }

  if (!child) {
    if ('value' in block.node) {
      const newVal = applyAll(block.node.value, [
        {
          ...patch,
          path: patch.path.slice(1),
        },
      ])

      Transforms.setNodes(
        editor,
        {...block.node, value: newVal},
        {at: [block.index]},
      )

      return true
    }

    return false
  }

  return false
}

function findBlock(
  children: Descendant[],
  path: Path,
): {node: Descendant; index: number} | undefined {
  let blockIndex = -1

  const block = children.find((node: Descendant, index: number) => {
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
  block: {node: Descendant; index: number},
  path: Path,
): {node: Descendant; index: number} | undefined {
  const blockNode = block.node

  if (!Element.isElement(blockNode) || path[1] !== 'children') {
    return undefined
  }

  let childIndex = -1

  const child = blockNode.children.find((node, index: number) => {
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
