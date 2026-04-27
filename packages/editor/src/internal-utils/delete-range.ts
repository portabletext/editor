import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getFirstChild} from '../node-traversal/get-first-child'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {rangeEdges} from '../slate/range/range-edges'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyMergeNode} from './apply-merge-node'
import {setNodeProperties} from './set-node-properties'

/**
 * Delete an expanded range, handling cross-parent and cross-block ranges
 * uniformly. Three cases:
 *
 * - Same block: span-level partial delete + merge of intermediate spans into
 *   the start span.
 * - Same parent, cross-block: block-level partial delete + merge of the end
 *   block into the start block. Used by Backspace and `insert.block` chains
 *   where surviving content collapses into a single block.
 * - Cross-parent: partial content removal at each end, blocks fully inside
 *   the range get unset, both block shells are kept. Merging across parents
 *   would require moving nodes across structural levels.
 */
export function deleteRange(
  editor: PortableTextSlateEditor,
  range: Range,
): void {
  const [start, end] = rangeEdges(range, {}, editor)

  const startBlock = getEnclosingBlock(editor, start.path)
  const endBlock = getEnclosingBlock(editor, end.path)

  if (!startBlock || !endBlock) {
    return
  }

  if (pathEquals(startBlock.path, endBlock.path)) {
    deleteSameBlockRange(editor, start, end)
    return
  }

  const sameParent = pathEquals(
    parentPath(startBlock.path),
    parentPath(endBlock.path),
  )

  if (sameParent) {
    deleteSameParentCrossBlockRange(
      editor,
      startBlock.path,
      endBlock.path,
      start,
      end,
    )
    return
  }

  deleteCrossParentRange(editor, startBlock.path, endBlock.path, start, end)
}

function deleteSameBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
): void {
  if (pathEquals(start.path, end.path)) {
    removeTextRange(editor, start.path, start.offset, end.offset)
    return
  }

  removeTextFromOffset(editor, start.path, start.offset)
  removeChildrenBetween(editor, start.path, end.path)

  const adjustedEnd = getSibling(editor, start.path, 'next')
  if (!adjustedEnd) {
    return
  }
  removeTextUpToOffset(editor, adjustedEnd.path, end.offset)
  mergeNode(editor, adjustedEnd.path, getSpanLength(editor, start.path))
}

function deleteSameParentCrossBlockRange(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
): void {
  if (!pathEquals(start.path, startBlockPath)) {
    removeTextFromOffset(editor, start.path, start.offset)
    removeTrailingChildren(editor, start.path)
  }

  removeBlocksBetween(editor, startBlockPath, endBlockPath)

  const adjustedEndBlock = getSibling(editor, startBlockPath, 'next')
  const adjustedEndBlockPath = adjustedEndBlock?.path ?? startBlockPath

  if (!pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, adjustedEndBlockPath, end.path)
    const firstChild = getFirstChild(editor, adjustedEndBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }

  mergeBlock(editor, startBlockPath, adjustedEndBlockPath)
}

function deleteCrossParentRange(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
): void {
  if (!pathEquals(start.path, startBlockPath)) {
    removeTextFromOffset(editor, start.path, start.offset)
    removeTrailingChildren(editor, start.path)
  }

  if (!pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, endBlockPath, end.path)
    const firstChild = getFirstChild(editor, endBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }
}

function removeTextRange(
  editor: PortableTextSlateEditor,
  path: Path,
  startOffset: number,
  endOffset: number,
): void {
  const span = getSpanNode(editor, path)
  if (!span) {
    return
  }
  const text = span.node.text.slice(startOffset, endOffset)
  if (text.length === 0) {
    return
  }
  editor.apply({type: 'remove_text', path, offset: startOffset, text})
}

function removeTextFromOffset(
  editor: PortableTextSlateEditor,
  path: Path,
  offset: number,
): void {
  const span = getSpanNode(editor, path)
  if (!span || offset >= span.node.text.length) {
    return
  }
  editor.apply({
    type: 'remove_text',
    path,
    offset,
    text: span.node.text.slice(offset),
  })
}

function removeTextUpToOffset(
  editor: PortableTextSlateEditor,
  path: Path,
  offset: number,
): void {
  if (offset <= 0) {
    return
  }
  const span = getSpanNode(editor, path)
  if (!span) {
    return
  }
  editor.apply({
    type: 'remove_text',
    path,
    offset: 0,
    text: span.node.text.slice(0, offset),
  })
}

function getSpanLength(editor: PortableTextSlateEditor, path: Path): number {
  return getSpanNode(editor, path)?.node.text.length ?? 0
}

/**
 * Remove children between `startChildPath` and `endChildPath` (exclusive on
 * both ends). Both paths must share the same parent.
 */
function removeChildrenBetween(
  editor: PortableTextSlateEditor,
  startChildPath: Path,
  endChildPath: Path,
): void {
  let cursor = getSibling(editor, startChildPath, 'next')
  while (cursor && !pathEquals(cursor.path, endChildPath)) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, startChildPath, 'next')
  }
}

/**
 * Remove every child of `startChildPath`'s parent that comes AFTER it.
 */
function removeTrailingChildren(
  editor: PortableTextSlateEditor,
  startChildPath: Path,
): void {
  let cursor = getSibling(editor, startChildPath, 'next')
  while (cursor) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, startChildPath, 'next')
  }
}

/**
 * Remove leading children of `blockPath` until `endChildPath` is the first
 * child.
 */
function removeLeadingChildrenOf(
  editor: PortableTextSlateEditor,
  blockPath: Path,
  endChildPath: Path,
): void {
  const endKey = (endChildPath.at(-1) as {_key?: string} | undefined)?._key
  if (!endKey) {
    return
  }
  let firstChild = getFirstChild(editor, blockPath)
  while (
    firstChild &&
    (firstChild.path.at(-1) as {_key?: string} | undefined)?._key !== endKey
  ) {
    removeNodeAt(editor, firstChild.path)
    firstChild = getFirstChild(editor, blockPath)
  }
}

/**
 * Remove blocks between `startBlockPath` and `endBlockPath` (exclusive on
 * both ends). Both paths must share the same parent.
 */
function removeBlocksBetween(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
): void {
  let cursor = getSibling(editor, startBlockPath, 'next')
  while (cursor && !pathEquals(cursor.path, endBlockPath)) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, startBlockPath, 'next')
  }
}

function mergeNode(
  editor: PortableTextSlateEditor,
  path: Path,
  position: number,
): void {
  applyMergeNode(editor, path, position)
}

function mergeBlock(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
): void {
  if (pathEquals(startBlockPath, endBlockPath)) {
    return
  }
  const startBlock = getTextBlockNode(editor, startBlockPath)
  const endBlock = getTextBlockNode(editor, endBlockPath)
  if (!startBlock || !endBlock) {
    return
  }
  const endMarkDefs = endBlock.node.markDefs
  if (Array.isArray(endMarkDefs) && endMarkDefs.length > 0) {
    const oldDefs = startBlock.node.markDefs ?? []
    const newMarkDefs = [
      ...new Map(
        [...oldDefs, ...endMarkDefs].map((def) => [def._key, def]),
      ).values(),
    ]
    setNodeProperties(editor, {markDefs: newMarkDefs}, startBlockPath)
  }
  applyMergeNode(editor, endBlockPath, startBlock.node.children.length)
}

function removeNodeAt(editor: PortableTextSlateEditor, path: Path): void {
  if (!getNode(editor, path)) {
    return
  }
  editor.apply({type: 'unset', path})
}
