import {
  isSpan,
  isTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import {end} from '../slate/editor/end'
import {isEditor} from '../slate/editor/is-editor'
import {node as editorNode} from '../slate/editor/node'
import {nodes as editorNodes} from '../slate/editor/nodes'
import {start} from '../slate/editor/start'
import type {Editor} from '../slate/interfaces/editor'
import type {Node} from '../slate/interfaces/node'
import type {Path as SlatePath} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {getChild} from '../slate/node/get-child'
import {isBackwardRange} from '../slate/range/is-backward-range'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isListBlock} from '../utils/parse-blocks'

export function getFocusBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  try {
    return (
      editorNode(editor, editor.selection.focus.path.slice(0, 1)) ?? [
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
}): [node: PortableTextSpan, path: SlatePath] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  try {
    const [focusBlock] = getFocusBlock({editor})

    if (!focusBlock) {
      return [undefined, undefined]
    }

    if (!isTextBlock({schema: editor.schema}, focusBlock)) {
      return [undefined, undefined]
    }

    const [node, path] = editorNode(
      editor,
      editor.selection.focus.path.slice(0, 2),
    )

    if (isSpan({schema: editor.schema}, node)) {
      return [node, path]
    }
  } catch {
    return [undefined, undefined]
  }

  return [undefined, undefined]
}

export function getPointBlock({
  editor,
  point,
}: {
  editor: PortableTextSlateEditor
  point: Point
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  try {
    const [block] = editorNode(editor, point.path.slice(0, 1)) ?? [
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
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  const [focusBlock, focusBlockPath] = getFocusBlock({editor})
  const childIndex = editor.selection?.focus.path.at(1)

  if (!focusBlock || !focusBlockPath || childIndex === undefined) {
    return [undefined, undefined]
  }

  try {
    const focusChild = getChild(focusBlock, childIndex, editor.schema)

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
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  if (editor.children.length === 0) {
    return [undefined, undefined]
  }

  const firstPoint = start(editor, [])
  const firstBlockPath = firstPoint.path.at(0)

  try {
    return firstBlockPath !== undefined
      ? (editorNode(editor, [firstBlockPath]) ?? [undefined, undefined])
      : [undefined, undefined]
  } catch {
    return [undefined, undefined]
  }
}

export function getLastBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  if (editor.children.length === 0) {
    return [undefined, undefined]
  }

  const lastPoint = end(editor, [])
  const lastBlockPath = lastPoint.path.at(0)

  try {
    return lastBlockPath !== undefined
      ? (editorNode(editor, [lastBlockPath]) ?? [undefined, undefined])
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
  node: Editor | Node
}) {
  if (isEditor(node)) {
    return undefined
  }

  if (isBlockElement({schema}, node)) {
    return elementToBlock({schema, element: node})
  }

  const parent = Array.from(
    editorNodes(editor, {
      mode: 'highest',
      at: [],
      match: (n) =>
        isBlockElement({schema}, n) &&
        n.children.some((child: Node) => child._key === node._key),
    }),
  )
    .at(0)
    ?.at(0)

  return isTextBlock({schema: editor.schema}, parent)
    ? elementToBlock({
        schema,
        element: parent,
      })
    : undefined
}

function elementToBlock({
  element,
}: {
  schema: EditorSchema
  element: PortableTextTextBlock
}) {
  return element
}

function isBlockElement(
  {schema}: {schema: EditorSchema},
  node: Node,
): node is PortableTextTextBlock {
  return isTextBlock({schema}, node)
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
    ...editorNodes(editor, {
      at: editor.selection,
      match: (node) => isTextBlock({schema: editor.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      ([node]) =>
        isListBlock({schema: editor.schema}, node) &&
        node.listItem === listItem,
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
    ...editorNodes(editor, {
      at: editor.selection,
      match: (node) => isTextBlock({schema: editor.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(([node]) => node.style === style)
  }

  return false
}

export function slateRangeToSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): EditorSelection {
  const anchor = slatePointToSelectionPoint({
    schema,
    editor,
    point: range.anchor,
  })
  const focus = slatePointToSelectionPoint({schema, editor, point: range.focus})

  if (!anchor || !focus) {
    return null
  }

  return {
    anchor,
    focus,
    backward: isBackwardRange(range),
  }
}

export function slatePointToSelectionPoint({
  schema,
  editor,
  point,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  point: Point
}): EditorSelectionPoint | undefined {
  const keyedPath = indexedPathToKeyedPath(editor, point.path, schema)

  if (!keyedPath) {
    return undefined
  }

  return {
    path: keyedPath,
    offset: point.offset,
  }
}
