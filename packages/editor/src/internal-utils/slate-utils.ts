import type {PortableTextSpan} from '@sanity/types'
import {Editor, Element, Node, Range, type Path, type Point} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import {fromSlateValue} from './values'

export function getBlockPath({
  editor,
  _key,
}: {
  editor: PortableTextSlateEditor
  _key: string
}): [number] | undefined {
  const [, blockPath] = Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n) => n._key === _key,
    }),
  ).at(0) ?? [undefined, undefined]

  const blockIndex = blockPath?.at(0)

  if (blockIndex === undefined) {
    return undefined
  }

  return [blockIndex]
}

export function getAnchorBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  try {
    return (
      Editor.node(editor, editor.selection.anchor.path.slice(0, 1)) ?? [
        undefined,
        undefined,
      ]
    )
  } catch {
    return [undefined, undefined]
  }
}

export function getFocusBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  try {
    return (
      Editor.node(editor, editor.selection.focus.path.slice(0, 1)) ?? [
        undefined,
        undefined,
      ]
    )
  } catch {
    return [undefined, undefined]
  }
}

export function getFocusSpan({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: PortableTextSpan, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  try {
    const [focusBlock] = getFocusBlock({editor})

    if (!focusBlock) {
      return [undefined, undefined]
    }

    if (!editor.isTextBlock(focusBlock)) {
      return [undefined, undefined]
    }

    const [node, path] = Editor.node(
      editor,
      editor.selection.focus.path.slice(0, 2),
    )

    if (editor.isTextSpan(node)) {
      return [node, path]
    }
  } catch {
    return [undefined, undefined]
  }

  return [undefined, undefined]
}

export function getSelectionStartBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  const selectionStartPoint = Range.start(editor.selection)

  return getPointBlock({editor, point: selectionStartPoint})
}

export function getSelectionEndBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  const selectionEndPoint = Range.end(editor.selection)

  return getPointBlock({editor, point: selectionEndPoint})
}

export function getPointBlock({
  editor,
  point,
}: {
  editor: PortableTextSlateEditor
  point: Point
}): [node: Node, path: Path] | [undefined, undefined] {
  try {
    const [block] = Editor.node(editor, point.path.slice(0, 1)) ?? [
      undefined,
      undefined,
    ]
    return block ? [block, point.path.slice(0, 1)] : [undefined, undefined]
  } catch {
    return [undefined, undefined]
  }
}

export function getFocusChild({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const [focusBlock, focusBlockPath] = getFocusBlock({editor})
  const childIndex = editor.selection?.focus.path.at(1)

  if (!focusBlock || !focusBlockPath || childIndex === undefined) {
    return [undefined, undefined]
  }

  try {
    const focusChild = Node.child(focusBlock, childIndex)

    return focusChild
      ? [focusChild, [...focusBlockPath, childIndex]]
      : [undefined, undefined]
  } catch {
    return [undefined, undefined]
  }
}

export function getFirstBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (editor.children.length === 0) {
    return [undefined, undefined]
  }

  const firstPoint = Editor.start(editor, [])
  const firstBlockPath = firstPoint.path.at(0)

  try {
    return firstBlockPath !== undefined
      ? (Editor.node(editor, [firstBlockPath]) ?? [undefined, undefined])
      : [undefined, undefined]
  } catch {
    return [undefined, undefined]
  }
}

export function getLastBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (editor.children.length === 0) {
    return [undefined, undefined]
  }

  const lastPoint = Editor.end(editor, [])
  const lastBlockPath = lastPoint.path.at(0)

  try {
    return lastBlockPath !== undefined
      ? (Editor.node(editor, [lastBlockPath]) ?? [undefined, undefined])
      : [undefined, undefined]
  } catch {
    return [undefined, undefined]
  }
}

export function getNodeBlock({
  editor,
  schema,
  node,
}: {
  editor: PortableTextSlateEditor
  schema: EditorSchema
  node: Node
}) {
  if (Editor.isEditor(node)) {
    return undefined
  }

  if (isBlockElement({editor, schema}, node)) {
    return elementToBlock({schema, element: node})
  }

  const parent = Array.from(
    Editor.nodes(editor, {
      mode: 'highest',
      at: [],
      match: (n) =>
        isBlockElement({editor, schema}, n) &&
        n.children.some((child) => child._key === node._key),
    }),
  )
    .at(0)
    ?.at(0)

  return Element.isElement(parent)
    ? elementToBlock({
        schema,
        element: parent,
      })
    : undefined
}

function elementToBlock({
  schema,
  element,
}: {
  schema: EditorSchema
  element: Element
}) {
  return fromSlateValue([element], schema.block.name)?.at(0)
}

function isBlockElement(
  {editor, schema}: {editor: PortableTextSlateEditor; schema: EditorSchema},
  node: Node,
): node is Element {
  return (
    Element.isElement(node) &&
    !editor.isInline(node) &&
    (schema.block.name === node._type ||
      schema.blockObjects.some(
        (blockObject) => blockObject.name === node._type,
      ))
  )
}

export function isListItemActive({
  editor,
  listItem,
}: {
  editor: Editor
  listItem: string
}): boolean {
  if (!editor.selection) {
    return false
  }

  const selectedBlocks = [
    ...Editor.nodes(editor, {
      at: editor.selection,
      match: (node) => editor.isTextBlock(node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      ([node]) => editor.isListBlock(node) && node.listItem === listItem,
    )
  }

  return false
}

export function isStyleActive({
  editor,
  style,
}: {
  editor: Editor
  style: string
}): boolean {
  if (!editor.selection) {
    return false
  }

  const selectedBlocks = [
    ...Editor.nodes(editor, {
      at: editor.selection,
      match: (node) => editor.isTextBlock(node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(([node]) => node.style === style)
  }

  return false
}

/**
 * Gets all container blocks in the path and the child at a point.
 * For a path like [0, 0, 0, 0] (table > row > cell > span), returns all blocks
 * in the hierarchy: [table, row, cell] and the span child.
 */
function getPointBlocksAndChild({
  editor,
  point,
}: {
  editor: PortableTextSlateEditor
  point: Point
}): {
  blocks: Node[]
  child: Node | undefined
} {
  try {
    const pathDepth = point.path.length

    if (pathDepth < 1) {
      return {blocks: [], child: undefined}
    }

    // Get all blocks in the hierarchy by traversing from root to the parent of the leaf
    const blocks: Node[] = []

    // For text blocks, path is [blockIndex, childIndex] - only 1 block
    // For nested containers, path is [0, 0, 0, 0] - we need blocks at [0], [0,0], [0,0,0]

    if (pathDepth === 1) {
      // Just the top-level block, no child
      const [block] = Editor.node(editor, point.path) ?? [undefined]
      if (block && Element.isElement(block)) {
        blocks.push(block)
      }
      return {blocks, child: undefined}
    }

    // Get all blocks from root to parent of leaf
    for (let depth = 1; depth < pathDepth; depth++) {
      const blockPath = point.path.slice(0, depth)
      const [block] = Editor.node(editor, blockPath) ?? [undefined]

      if (block && Element.isElement(block)) {
        blocks.push(block)
      }
    }

    // Get the child (leaf node)
    const parentPath = point.path.slice(0, -1)
    const childIndex = point.path[point.path.length - 1]
    const [parent] = Editor.node(editor, parentPath) ?? [undefined]

    const child =
      parent && Element.isElement(parent)
        ? parent.children?.[childIndex]
        : undefined

    return {blocks, child}
  } catch {
    return {blocks: [], child: undefined}
  }
}

export function slateRangeToSelection({
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): EditorSelection {
  const {blocks: anchorBlocks, child: anchorChild} = getPointBlocksAndChild({
    editor,
    point: range.anchor,
  })
  const {blocks: focusBlocks, child: focusChild} = getPointBlocksAndChild({
    editor,
    point: range.focus,
  })

  if (anchorBlocks.length === 0 || focusBlocks.length === 0) {
    return null
  }

  // The selection path should include the full path from root through all container blocks
  // For nested containers like [table, row, cell] + span, we want:
  // [{_key: table}, 'children', {_key: row}, 'children', {_key: cell}, 'children', {_key: span}]
  // For inline objects, the inline object itself is in the blocks array, so we don't add it as a child

  const buildPath = (blocks: Node[], child: Node | undefined) => {
    const path: Array<{_key: string} | 'children'> = []

    // Check if the last block is an inline object (has __inline property)
    const lastBlock = blocks[blocks.length - 1]
    const lastBlockIsInlineObject =
      lastBlock && '__inline' in lastBlock && lastBlock.__inline === true

    // Build the full path through all container blocks
    for (const block of blocks) {
      if (!block || !('_key' in block)) {
        return []
      }

      if (path.length > 0) {
        path.push('children')
      }
      path.push({_key: block._key})
    }

    // Add the child (span) if present and not a void-child
    // If the last block is an inline object, don't add the void-child
    if (
      child &&
      '_key' in child &&
      child._key !== 'void-child' &&
      !lastBlockIsInlineObject
    ) {
      path.push('children')
      path.push({_key: child._key})
    }

    return path
  }

  const selection: EditorSelection = {
    anchor: {
      path: buildPath(anchorBlocks, anchorChild),
      offset: range.anchor.offset,
    },
    focus: {
      path: buildPath(focusBlocks, focusChild),
      offset: range.focus.offset,
    },
    backward: Range.isBackward(range),
  }

  return selection
}
