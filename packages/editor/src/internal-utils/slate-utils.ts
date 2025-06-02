import type {PortableTextBlock, PortableTextSpan} from '@sanity/types'
import {Editor, Element, Node, Range, type Path, type Point} from 'slate'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  EditorSelection,
  KeyedEditorSelection,
} from '../editor/editor-selection'
import type {PortableTextSlateEditor} from '../types/editor'
import type {KeyedBlockPath} from '../types/paths'
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
    const [node, path] = Editor.node(editor, editor.selection.focus.path)

    if (editor.isTextSpan(node)) {
      return [node, path]
    }
  } catch {
    return [undefined, undefined]
  }

  return [undefined, undefined]
}

export function getSelectedSpans({
  editor,
}: {
  editor: PortableTextSlateEditor
}): Array<[node: PortableTextSpan, path: Path]> {
  if (!editor.selection) {
    return []
  }

  try {
    return Array.from(
      Editor.nodes(editor, {
        at: editor.selection,
        match: (node) => editor.isTextSpan(node),
      }),
    )
  } catch {
    return []
  }
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

export function getPointChild({
  editor,
  point,
}: {
  editor: PortableTextSlateEditor
  point: Point
}): [node: Node, path: Path] | [undefined, undefined] {
  const [block, blockPath] = getPointBlock({editor, point})
  const childIndex = point.path.at(1)

  if (!block || !blockPath || childIndex === undefined) {
    return [undefined, undefined]
  }

  try {
    const pointChild = Node.child(block, childIndex)

    return pointChild
      ? [pointChild, [...blockPath, childIndex]]
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
}):
  | {
      node: PortableTextBlock
      path: KeyedBlockPath
      index: number
    }
  | undefined {
  if (Editor.isEditor(node)) {
    return undefined
  }

  if (isBlockElement({editor, schema}, node)) {
    const blockNode = elementToBlock({schema, element: node})

    if (!blockNode) {
      return undefined
    }

    const blockIndex = editor.children.findIndex(
      (child) => child._key === blockNode._key,
    )

    if (blockIndex === -1) {
      return undefined
    }

    return {
      node: blockNode,
      path: [{_key: blockNode._key}],
      index: blockIndex,
    }
  }

  const [parent, parentPath] = Array.from(
    Editor.nodes(editor, {
      mode: 'highest',
      at: [],
      match: (n) =>
        isBlockElement({editor, schema}, n) &&
        n.children.some((child) => child._key === node._key),
    }),
  ).at(0) ?? [undefined, undefined]

  if (!parent || !parentPath) {
    return undefined
  }

  if (!Element.isElement(parent)) {
    return undefined
  }

  const block = elementToBlock({schema, element: parent})

  if (!block) {
    return undefined
  }

  const blockIndex = parentPath.at(0)

  if (blockIndex === undefined) {
    return undefined
  }

  return {
    node: block,
    path: [{_key: block._key}],
    index: blockIndex,
  }
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

export function slateRangeToKeyedSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): KeyedEditorSelection {
  const [anchorBlock] = getPointBlock({
    editor,
    point: range.anchor,
  })
  const [focusBlock] = getPointBlock({
    editor,
    point: range.focus,
  })

  if (!anchorBlock || !focusBlock) {
    return null
  }

  const [anchorChild] =
    anchorBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.anchor,
        })
      : [undefined, undefined]
  const [focusChild] =
    focusBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.focus,
        })
      : [undefined, undefined]

  const selection: EditorSelection = {
    anchor: {
      path: [{_key: anchorBlock._key}],
      offset: range.anchor.offset,
    },
    focus: {
      path: [{_key: focusBlock._key}],
      offset: range.focus.offset,
    },
    backward: Range.isBackward(range),
  }

  if (anchorChild) {
    selection.anchor.path.push('children')
    selection.anchor.path.push({_key: anchorChild._key})
  }

  if (focusChild) {
    selection.focus.path.push('children')
    selection.focus.path.push({_key: focusChild._key})
  }

  return selection
}
