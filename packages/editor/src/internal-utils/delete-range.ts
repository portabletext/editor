import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getFirstChild} from '../node-traversal/get-first-child'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {isEditableContainer} from '../schema/is-editable-container'
import {parentAcceptsTextBlock} from '../schema/parent-accepts-text-block'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {pathRef} from '../slate/editor/path-ref'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {commonPath} from '../slate/path/common-path'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {rangeEdges} from '../slate/range/range-edges'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
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
  removeSiblingsBetweenPaths(editor, start.path, end.path)

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
    removeTrailingSiblings(editor, start.path)
  }

  removeSiblingsBetweenPaths(editor, startBlockPath, endBlockPath)

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
  // Edge promotion: walk up the start side as long as the start point is the
  // truly-first point of each successive ancestor (and the ancestor is still
  // below the common parent of the two blocks). Same for the end side at
  // truly-last point. This lets a select-all-style range fully delete every
  // container between start and end, including the start/end containers
  // themselves when the selection covers them edge-to-edge.
  const common = commonPath(startBlockPath, endBlockPath)

  let startTopPath = startBlockPath
  while (startTopPath.length > common.length + 1) {
    const parent = parentPath(startTopPath)
    if (!isStart(editor, start, parent)) {
      break
    }
    startTopPath = parent
  }

  let endTopPath = endBlockPath
  while (endTopPath.length > common.length + 1) {
    const parent = parentPath(endTopPath)
    if (!isEnd(editor, end, parent)) {
      break
    }
    endTopPath = parent
  }

  // Refs survive the structural mutations below. `startTopPath` and
  // `endTopPath` may shift when intermediate siblings get unset.
  const startTopRef = pathRef(editor, startTopPath)
  const endTopRef = pathRef(editor, endTopPath)

  // A "top" is removed wholesale only when it's a registered editable
  // container. Text blocks at the start/end keep their shell (existing
  // partial-trim semantics) so consumers don't lose the implicit placeholder
  // a top-of-document Backspace usually produces.
  const startTopNode = getNode(editor, startTopPath)
  const endTopNode = getNode(editor, endTopPath)
  const startCoversTop =
    startTopNode !== undefined &&
    isEditableContainer(editor, startTopNode.node, startTopPath) &&
    isStart(editor, start, startTopPath)
  const endCoversTop =
    endTopNode !== undefined &&
    isEditableContainer(editor, endTopNode.node, endTopPath) &&
    isEnd(editor, end, endTopPath)
  const willUnsetStartTop =
    startCoversTop && parentAcceptsTextBlock(editor, startTopPath)
  const willUnsetEndTop =
    endCoversTop && parentAcceptsTextBlock(editor, endTopPath)

  // 1. Trim partial content at the start block. Skipped when we'll unset
  //    startTopPath wholesale (the trim would be redundant), or when start
  //    is exactly at the block boundary.
  if (!willUnsetStartTop && !pathEquals(start.path, startBlockPath)) {
    removeTextFromOffset(editor, start.path, start.offset)
    removeTrailingSiblings(editor, start.path)
  }

  // 2. Symmetric for end.
  if (!willUnsetEndTop && !pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, endBlockPath, end.path)
    const firstChild = getFirstChild(editor, endBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }

  // 3. Walk down the start-side ancestor chain. For each ancestor of
  //    startBlock strictly between the common-parent's child level (handled
  //    by step 5) and startBlock itself (handled by step 1), remove trailing
  //    siblings -- but only if the parent field accepts a text block as a
  //    substitute. A row inside `table.rows` (which only allows rows) keeps
  //    its siblings; a block inside `code-block.lines` (which allows blocks)
  //    loses them.
  for (
    let entryLen = common.length + 2;
    entryLen <= startBlockPath.length;
    entryLen++
  ) {
    const entry = startBlockPath.slice(0, entryLen)
    if (isKeyedSegment(entry.at(-1)) && parentAcceptsTextBlock(editor, entry)) {
      removeTrailingSiblings(editor, entry)
    }
  }

  // 4. Symmetric for end side: remove leading siblings at each intermediate
  //    keyed level (gated on parent-accepts-text-block).
  for (
    let entryLen = common.length + 2;
    entryLen <= endBlockPath.length;
    entryLen++
  ) {
    const entry = endBlockPath.slice(0, entryLen)
    if (isKeyedSegment(entry.at(-1)) && parentAcceptsTextBlock(editor, entry)) {
      removeLeadingSiblings(editor, entry)
    }
  }

  // 5. At common level: remove siblings strictly between the start-side and
  //    end-side ancestors at common-depth + 1, gated on whether common's
  //    field accepts a text block.
  const finalStartTop = startTopRef.current
  const finalEndTop = endTopRef.current
  if (finalStartTop && finalEndTop) {
    const startAtCommonChild = finalStartTop.slice(0, common.length + 1)
    const endAtCommonChild = finalEndTop.slice(0, common.length + 1)
    if (parentAcceptsTextBlock(editor, startAtCommonChild)) {
      removeSiblingsBetweenPaths(editor, startAtCommonChild, endAtCommonChild)
    }
  }

  // 6. Unset start-top / end-top wholesale when the parent field accepts a
  //    text block in their place.
  if (willUnsetStartTop) {
    const path = startTopRef.unref()
    if (path) {
      removeNodeAt(editor, path)
    }
  } else {
    startTopRef.unref()
  }

  if (willUnsetEndTop) {
    const path = endTopRef.unref()
    if (path) {
      removeNodeAt(editor, path)
    }
  } else {
    endTopRef.unref()
  }
}

/**
 * Remove every sibling of `path` that comes AFTER it.
 */
function removeTrailingSiblings(
  editor: PortableTextSlateEditor,
  path: Path,
): void {
  let cursor = getSibling(editor, path, 'next')
  while (cursor) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, path, 'next')
  }
}

/**
 * Remove every sibling of `path` that comes BEFORE it.
 */
function removeLeadingSiblings(
  editor: PortableTextSlateEditor,
  path: Path,
): void {
  let cursor = getSibling(editor, path, 'previous')
  while (cursor) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, path, 'previous')
  }
}

/**
 * Remove siblings strictly between `startPath` and `endPath` (exclusive on
 * both ends). Both paths must share the same parent.
 */
function removeSiblingsBetweenPaths(
  editor: PortableTextSlateEditor,
  startPath: Path,
  endPath: Path,
): void {
  let cursor = getSibling(editor, startPath, 'next')
  while (cursor && !pathEquals(cursor.path, endPath)) {
    removeNodeAt(editor, cursor.path)
    cursor = getSibling(editor, startPath, 'next')
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
