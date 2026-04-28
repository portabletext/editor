import {getChildren} from '../node-traversal/get-children'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getFirstChild} from '../node-traversal/get-first-child'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {getContainerScopedName} from '../schema/get-container-scoped-name'
import {isEditableContainer} from '../schema/is-editable-container'
import {parentAcceptsTextBlock} from '../schema/parent-accepts-text-block'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {pathRef} from '../slate/editor/path-ref'
import type {Node} from '../slate/interfaces/node'
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
import {createPlaceholderBlock} from './create-placeholder-block'
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
  //    by step 5) and startBlock itself (handled by step 1), handle trailing
  //    siblings. When the parent field accepts a text block (e.g.
  //    `code-block.lines`), siblings are removed wholesale. When the parent
  //    field only accepts a structural sub-container (e.g. `table.rows` of
  //    rows, or `row.cells` of cells), the sibling shells are kept but
  //    their inner content is cleared back to a placeholder block.
  for (
    let entryLen = common.length + 2;
    entryLen <= startBlockPath.length;
    entryLen++
  ) {
    const entry = startBlockPath.slice(0, entryLen)
    if (!isKeyedSegment(entry.at(-1))) {
      continue
    }
    if (parentAcceptsTextBlock(editor, entry)) {
      removeTrailingSiblings(editor, entry)
    } else {
      clearTrailingSiblingContents(editor, entry)
    }
  }

  // 4. Symmetric for end side: handle leading siblings at each intermediate
  //    keyed level. Wholesale removal when parent accepts a text block;
  //    otherwise clear-content while keeping the sibling shells.
  for (
    let entryLen = common.length + 2;
    entryLen <= endBlockPath.length;
    entryLen++
  ) {
    const entry = endBlockPath.slice(0, entryLen)
    if (!isKeyedSegment(entry.at(-1))) {
      continue
    }
    if (parentAcceptsTextBlock(editor, entry)) {
      removeLeadingSiblings(editor, entry)
    } else {
      clearLeadingSiblingContents(editor, entry)
    }
  }

  // 5. At common level: handle siblings strictly between the start-side and
  //    end-side ancestors at common-depth + 1. Wholesale removal when
  //    common's field accepts a text block; otherwise clear-content while
  //    keeping the sibling shells.
  const finalStartTop = startTopRef.current
  const finalEndTop = endTopRef.current
  if (finalStartTop && finalEndTop) {
    const startAtCommonChild = finalStartTop.slice(0, common.length + 1)
    const endAtCommonChild = finalEndTop.slice(0, common.length + 1)
    if (parentAcceptsTextBlock(editor, startAtCommonChild)) {
      removeSiblingsBetweenPaths(editor, startAtCommonChild, endAtCommonChild)
    } else {
      clearSiblingContentsBetweenPaths(
        editor,
        startAtCommonChild,
        endAtCommonChild,
      )
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

/**
 * Clear the contents of every sibling AFTER `path`, keeping the sibling
 * shells intact. Used at structural-container levels (rows, cells) where
 * the sibling cannot be deleted wholesale because the parent field rejects
 * a text-block substitute.
 */
function clearTrailingSiblingContents(
  editor: PortableTextSlateEditor,
  path: Path,
): void {
  let cursor = getSibling(editor, path, 'next')
  while (cursor) {
    clearContainerContents(editor, cursor.node, cursor.path)
    cursor = getSibling(editor, cursor.path, 'next')
  }
}

/**
 * Clear the contents of every sibling BEFORE `path`, keeping the sibling
 * shells intact.
 */
function clearLeadingSiblingContents(
  editor: PortableTextSlateEditor,
  path: Path,
): void {
  let cursor = getSibling(editor, path, 'previous')
  while (cursor) {
    clearContainerContents(editor, cursor.node, cursor.path)
    cursor = getSibling(editor, cursor.path, 'previous')
  }
}

/**
 * Clear the contents of every sibling strictly between `startPath` and
 * `endPath` (exclusive on both ends), keeping the sibling shells intact.
 */
function clearSiblingContentsBetweenPaths(
  editor: PortableTextSlateEditor,
  startPath: Path,
  endPath: Path,
): void {
  let cursor = getSibling(editor, startPath, 'next')
  while (cursor && !pathEquals(cursor.path, endPath)) {
    clearContainerContents(editor, cursor.node, cursor.path)
    cursor = getSibling(editor, cursor.path, 'next')
  }
}

/**
 * Clear the inner content of an editable container, keeping its shell.
 *
 * For a container whose field accepts a text block (e.g. a cell with
 * `content` of `[block]`), the existing children are unset and a
 * placeholder block is inserted.
 *
 * For a structural container whose field only accepts more sub-containers
 * (e.g. a row with `cells` of `[cell]`), the function recurses into each
 * child so the leaves end up with placeholder blocks.
 *
 * Voids and other non-container nodes are left untouched.
 */
function clearContainerContents(
  editor: PortableTextSlateEditor,
  node: Node,
  path: Path,
): void {
  if (!isEditableContainer(editor, node, path)) {
    return
  }

  const scopedName = getContainerScopedName(editor, node, path)
  const container = editor.containers.get(scopedName)

  if (!container) {
    return
  }

  const fieldAcceptsBlock = container.field.of.some(
    (def) => def.type === 'block',
  )

  if (fieldAcceptsBlock) {
    // Remove every existing child, then synthesize an empty placeholder
    // text block. Fresh keys are deliberate: the selection wiped the
    // entire content, so the resulting state is a brand new empty block
    // (mirroring how delete-empty-container handles fully-cleared
    // containers).
    let firstChild = getFirstChild(editor, path)
    while (firstChild) {
      removeNodeAt(editor, firstChild.path)
      firstChild = getFirstChild(editor, path)
    }
    const placeholder = createPlaceholderBlock(editor, path)
    editor.apply({
      type: 'insert',
      path: [...path, container.field.name, 0],
      node: placeholder,
      position: 'before',
    })
    return
  }

  const children = getChildren(editor, path)
  for (const child of children) {
    clearContainerContents(editor, child.node, child.path)
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
