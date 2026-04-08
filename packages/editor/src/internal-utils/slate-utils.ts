import {isTextBlock} from '@portabletext/schema'
import {getNodes} from '../node-traversal/get-nodes'
import type {Editor} from '../slate/interfaces/editor'
import {rangeEdges} from '../slate/range/range-edges'
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

  const [selStart, selEnd] = rangeEdges(editor.selection, {}, editor)

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

  const [selStart, selEnd] = rangeEdges(editor.selection, {}, editor)

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
