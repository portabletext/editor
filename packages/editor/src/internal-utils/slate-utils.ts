import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import type {Editor} from '../slate/interfaces/editor'
import type {Node} from '../slate/interfaces/node'
import type {Path as SlatePath} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isBackwardRange} from '../slate/range/is-backward-range'
import {rangeEdges} from '../slate/range/range-edges'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isListBlock} from '../utils/parse-blocks'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

function getPointChild({
  editor,
  point,
}: {
  editor: PortableTextSlateEditor
  point: Point
}): [node: Node, path: SlatePath] | [undefined, undefined] {
  const blockEntry = getNode(editor, point.path.slice(0, 1))
  const childSegment = point.path.at(2)

  if (!blockEntry || !childSegment || !isKeyedSegment(childSegment)) {
    return [undefined, undefined]
  }

  const entry = getChildren(editor, blockEntry.path).find(
    (child) => child.node._key === childSegment._key,
  )

  return entry ? [entry.node, entry.path] : [undefined, undefined]
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

export function slateRangeToSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): EditorSelection {
  const anchorBlockEntry = getNode(editor, range.anchor.path.slice(0, 1))
  const focusBlockEntry = getNode(editor, range.focus.path.slice(0, 1))

  const anchorBlock = anchorBlockEntry?.node
  const focusBlock = focusBlockEntry?.node

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
    backward: isBackwardRange(range, editor),
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

export function slatePointToSelectionPoint({
  schema,
  editor,
  point,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  point: Point
}): EditorSelectionPoint | undefined {
  const blockEntry = getNode(editor, point.path.slice(0, 1))
  const block = blockEntry?.node

  if (!block) {
    return undefined
  }

  const [child] =
    block._type === schema.block.name
      ? getPointChild({
          editor,
          point,
        })
      : [undefined, undefined]

  if (child) {
    return {
      path: [{_key: block._key}, 'children', {_key: child._key}],
      offset: point.offset,
    }
  }

  return {
    path: [{_key: block._key}],
    offset: point.offset,
  }
}
