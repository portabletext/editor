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

  const focusBlock = Array.from(
    Editor.nodes(editor, {
      at: editor.selection.focus.path.slice(0, 1),
      match: (n) => !Editor.isEditor(n),
    }),
  ).at(0)

  return focusBlock ?? [undefined, undefined]
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

export function getLastBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const lastBlock = Array.from(
    Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n),
      at: [],
      reverse: true,
    }),
  ).at(0)

  return lastBlock ?? [undefined, undefined]
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

  if (isBlockElement(schema, node)) {
    return elementToBlock({schema, element: node})
  }

  const parent = Array.from(
    Editor.nodes(editor, {
      mode: 'highest',
      at: [],
      match: (n) =>
        isBlockElement(schema, n) &&
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

function isBlockElement(schema: EditorSchema, node: Node): node is Element {
  return (
    Element.isElement(node) &&
    (schema.block.name === node._type ||
      schema.blockObjects.some(
        (blockObject) => blockObject.name === node._type,
      ))
  )
}
