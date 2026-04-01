import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getNodes} from '../node-traversal/get-nodes'
import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import type {Editor} from '../slate/interfaces/editor'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isBackwardRange} from '../slate/range/is-backward-range'
import {rangeEdges} from '../slate/range/range-edges'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isListBlock} from '../utils/parse-blocks'

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

  const [selStart, selEnd] = rangeEdges(editor.selection)

  const selectedBlocks = [
    ...getNodes(editor, {
      from: selStart.path,
      to: selEnd.path,
      match: (node) => isTextBlock({schema: editor.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      (entry) =>
        isListBlock({schema: editor.schema}, entry.node) &&
        entry.node.listItem === listItem,
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

  const [selStart, selEnd] = rangeEdges(editor.selection)

  const selectedBlocks = [
    ...getNodes(editor, {
      from: selStart.path,
      to: selEnd.path,
      match: (node) => isTextBlock({schema: editor.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      (entry) =>
        isTextBlock({schema: editor.schema}, entry.node) &&
        entry.node.style === style,
    )
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
  const keyedPath = indexedPathToKeyedPath(
    {
      schema,
      editableTypes: editor.editableTypes,
      value: editor.children,
    },
    point.path,
  )

  if (!keyedPath) {
    return undefined
  }

  return {
    path: keyedPath,
    offset: point.offset,
  }
}
