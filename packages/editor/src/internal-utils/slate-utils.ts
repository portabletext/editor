import {Editor, Element, Node, type Path} from 'slate'
import type {EditorSchema} from '../editor/define-schema'
import type {PortableTextSlateEditor} from '../types/editor'
import {fromSlateValue} from './values'

export function getFocusBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  return (
    Editor.node(editor, editor.selection.focus.path.slice(0, 1)) ?? [
      undefined,
      undefined,
    ]
  )
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

  const focusChild = Node.child(focusBlock, childIndex)

  return focusChild
    ? [focusChild, [...focusBlockPath, childIndex]]
    : [undefined, undefined]
}

export function getFirstBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const firstPoint = Editor.start(editor, [])
  const firstBlockPath = firstPoint.path.at(0)

  return firstBlockPath !== undefined
    ? (Editor.node(editor, [firstBlockPath]) ?? [undefined, undefined])
    : [undefined, undefined]
}

export function getLastBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const lastPoint = Editor.end(editor, [])
  const lastBlockPath = lastPoint.path.at(0)
  return lastBlockPath !== undefined
    ? (Editor.node(editor, [lastBlockPath]) ?? [undefined, undefined])
    : [undefined, undefined]
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
