import {
  applyAll,
  type DiffMatchPatch,
  type InsertPatch,
  type Patch,
  type SetIfMissingPatch,
  type SetPatch,
  type UnsetPatch,
} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextChild} from '@portabletext/schema'
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
import {Editor, Element, Node, Text, type Descendant} from '../slate'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {applyDeselect, applySelect} from './apply-selection'
import {applySetNode} from './apply-set-node'
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

      blocksToInsert.forEach((node, i) => {
        editor.apply({type: 'insert_node', path: [i], node})
      })

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
    const normalizedIdx =
      position === 'after' ? targetBlockIndex + 1 : targetBlockIndex

    const editorWasEmptyBefore = isEqualToEmptyEditor(
      context.initialValue,
      editor.value,
      context.schema,
    )

    blocksToInsert.forEach((node, i) => {
      editor.apply({type: 'insert_node', path: [normalizedIdx + i], node})
    })

    if (
      editorWasEmptyBefore &&
      typeof patch.path[0] === 'number' &&
      patch.path[0] === 0
    ) {
      const removeIdx =
        position === 'before'
          ? targetBlockIndex + blocksToInsert.length
          : targetBlockIndex
      const [removeNode] = Editor.node(editor, [removeIdx])
      editor.apply({type: 'remove_node', path: [removeIdx], node: removeNode})
    }

    return true
  }

  // Insert children
  const {items, position} = patch

  const targetChild = findBlockChild(block, patch.path)

  if (!targetChild) {
    return false
  }

  const childrenToInsert = toSlateBlock(
    {...block.node, children: items as PortableTextChild[]},
    {schemaTypes: context.schema},
  )
  const normalizedIdx =
    position === 'after' ? targetChild.index + 1 : targetChild.index
  const childInsertPath = [block.index, normalizedIdx]

  if (childrenToInsert && Element.isElement(childrenToInsert)) {
    childrenToInsert.children.forEach((node, i) => {
      editor.apply({
        type: 'insert_node',
        path: [childInsertPath[0]!, childInsertPath[1]! + i],
        node,
      })
    })
  }

  return true
}

function setPatch(
  editor: PortableTextSlateEditor,
  patch: SetPatch | SetIfMissingPatch,
) {
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

  if (patch.path.length === 1) {
    const updatedBlock = applyAll(block.node, [
      {
        ...patch,
        path: patch.path.slice(1),
      },
    ])

    if (editor.isTextBlock(block.node) && Element.isElement(updatedBlock)) {
      applySetNode(editor, updatedBlock as unknown as Record<string, unknown>, [
        block.index,
      ])

      const previousSelection = editor.selection

      // Remove the previous children
      const childPaths = Array.from(
        Editor.nodes(editor, {
          at: [block.index],
          reverse: true,
          mode: 'lowest',
        }),
        ([, p]) => Editor.pathRef(editor, p),
      )
      for (const pathRef of childPaths) {
        const childPath = pathRef.unref()!
        if (childPath) {
          const [childNode] = Editor.node(editor, childPath)
          editor.apply({type: 'remove_node', path: childPath, node: childNode})
        }
      }

      // Insert the new children
      updatedBlock.children.forEach((node, i) => {
        editor.apply({
          type: 'insert_node',
          path: [block.index, i],
          node,
        })
      })

      // Restore the selection
      if (previousSelection) {
        applySelect(editor, previousSelection)
      }

      return true
    } else {
      applySetNode(editor, updatedBlock as unknown as Record<string, unknown>, [
        block.index,
      ])

      return true
    }
  }

  if (isTextBlock && patch.path[1] !== 'children') {
    const updatedBlock = applyAll(block.node, [
      {
        ...patch,
        path: patch.path.slice(1),
      },
    ])

    applySetNode(editor, updatedBlock as unknown as Record<string, unknown>, [
      block.index,
    ])

    return true
  }

  const child = findBlockChild(block, patch.path)

  // If this is targeting a text block child
  if (isTextBlock && child) {
    if (Text.isText(child.node)) {
      if (Text.isText(value)) {
        if (patch.type === 'setIfMissing') {
          return false
        }

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

        applySetNode(editor, newNode as unknown as Record<string, unknown>, [
          block.index,
          child.index,
        ])
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

      applySetNode(
        editor,
        {
          ...(child.node as unknown as Record<string, unknown>),
          value: newValue,
        },
        [block.index, child.index],
      )
    }

    return true
  } else if (block && 'value' in block.node) {
    if (patch.path.length > 1 && patch.path[1] !== 'children') {
      const newVal = applyAll(block.node.value, [
        {
          ...patch,
          path: patch.path.slice(1),
        },
      ])

      applySetNode(
        editor,
        {
          ...(block.node as unknown as Record<string, unknown>),
          value: newVal,
        },
        [block.index],
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
    applyDeselect(editor)

    const children = Node.children(editor, [], {
      reverse: true,
    })

    for (const [node, path] of children) {
      editor.apply({type: 'remove_node', path, node})
    }

    return true
  }

  const block = findBlock(editor.children, patch.path)

  if (!block) {
    return false
  }

  // Single blocks
  if (patch.path.length === 1) {
    const [blockNode] = Editor.node(editor, [block.index])
    editor.apply({type: 'remove_node', path: [block.index], node: blockNode})

    return true
  }

  const child = findBlockChild(block, patch.path)

  // Unset on text block children
  if (editor.isTextBlock(block.node) && child) {
    if (patch.path[1] === 'children' && patch.path.length === 3) {
      const [childNode] = Editor.node(editor, [block.index, child.index])
      editor.apply({
        type: 'remove_node',
        path: [block.index, child.index],
        node: childNode,
      })

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

    applySetNode(
      editor,
      {...(child.node as unknown as Record<string, unknown>), value: newValue},
      [block.index, child.index],
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

    const unsetProps: Record<string, null> = {}
    for (const prop of removedProperties) {
      unsetProps[prop] = null
    }
    applySetNode(editor, unsetProps, [block.index, child.index])

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

      applySetNode(
        editor,
        {
          ...(block.node as unknown as Record<string, unknown>),
          value: newVal,
        },
        [block.index],
      )

      return true
    }

    if (editor.isTextBlock(block.node)) {
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

      applySetNode(editor, {[propEntry]: null}, [block.index])

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
