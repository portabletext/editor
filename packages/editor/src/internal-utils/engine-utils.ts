import {isTextBlock} from '@portabletext/schema'
import type {Editor} from '../engine/interfaces/editor'
import {rangeEdges} from '../engine/range/range-edges'
import {getNodes} from '../traversal/get-nodes'
import {isListBlock} from '../utils/parse-blocks'

export function isListItemActive({
  editor,
  listItem,
}: {
  editor: Editor
  listItem: string
}): boolean {
  if (!editor.snapshot.context.selection) {
    return false
  }

  const [selStart, selEnd] = rangeEdges(
    editor.snapshot.context.selection,
    editor.snapshot.context,
  )

  const selectedBlocks = [
    ...getNodes(editor.snapshot, {
      from: selStart.path,
      to: selEnd.path,
      match: (node) =>
        isTextBlock({schema: editor.snapshot.context.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      (entry) =>
        isListBlock({schema: editor.snapshot.context.schema}, entry.node) &&
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
  if (!editor.snapshot.context.selection) {
    return false
  }

  const [selStart, selEnd] = rangeEdges(
    editor.snapshot.context.selection,
    editor.snapshot.context,
  )

  const selectedBlocks = [
    ...getNodes(editor.snapshot, {
      from: selStart.path,
      to: selEnd.path,
      match: (node) =>
        isTextBlock({schema: editor.snapshot.context.schema}, node),
    }),
  ]

  if (selectedBlocks.length > 0) {
    return selectedBlocks.every(
      (entry) =>
        isTextBlock({schema: editor.snapshot.context.schema}, entry.node) &&
        entry.node.style === style,
    )
  }

  return false
}
