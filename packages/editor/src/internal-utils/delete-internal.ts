import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getFirstChild} from '../node-traversal/get-first-child'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {pointRef} from '../slate/editor/point-ref'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isVoidNode} from '../slate/node/is-void-node'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {rangeEdges} from '../slate/range/range-edges'
import type {TextUnit} from '../slate/types/types'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {applyMergeNode} from './apply-merge-node'
import {setNodeProperties} from './set-node-properties'

/**
 * What to do with the editor selection once the delete completes.
 *
 * - `'collapse-to-start'` collapses selection to the start of the deleted
 *   range. The start point is tracked across the delete so it survives any
 *   nodes that get unset along the way.
 * - `'preserve'` leaves selection alone, for callers that update it
 *   themselves (e.g. operations that set their own post-delete cursor).
 */
export type SelectionMode = 'collapse-to-start' | 'preserve'

/**
 * Indic scripts whose grapheme clusters span multiple code points. Backward
 * character delete on these scripts removes one code point at a time instead
 * of the entire cluster.
 */
const COMPOUND_SCRIPT_REGEX =
  /[\u0980-\u09FF\u0E00-\u0E7F\u1000-\u109F\u0900-\u097F\u1780-\u17FF\u0D00-\u0D7F\u0B00-\u0B7F\u0A00-\u0A7F\u0B80-\u0BFF\u0C00-\u0C7F]+/

export interface ApplyDeleteOptions {
  /** Return the removed text. Used for compound-grapheme handling. */
  capture: boolean
  /** `true` if the range was produced by expanding a collapsed cursor. */
  collapsedInput: boolean
  /** `true` for backward delete (Backspace), `false` for forward (Delete). */
  reverse: boolean
  /** The unit the original input was expanded by. */
  unit: TextUnit
  selection: SelectionMode
  removeEmptyStartBlock: boolean
}

/**
 * Apply a resolved delete: mutate the tree, update selection, and reinsert
 * code points for compound-script backward character delete.
 *
 * The range is assumed to be expanded and well-formed (the user-facing entry
 * points handle resolution). Selection is tracked across the mutation through
 * point refs at both endpoints so that an unset start block falls back to the
 * surviving end block.
 */
export function applyDelete(
  editor: PortableTextSlateEditor,
  range: Range,
  options: ApplyDeleteOptions,
): void {
  const {
    capture,
    collapsedInput,
    reverse,
    unit,
    selection: mode,
    removeEmptyStartBlock,
  } = options

  const startRef =
    mode === 'collapse-to-start'
      ? pointRef(editor, range.anchor, {affinity: 'forward'})
      : null
  const endRef =
    mode === 'collapse-to-start'
      ? pointRef(editor, range.focus, {affinity: 'backward'})
      : null

  const removedText = mutateRange(editor, range, {
    capture,
    removeEmptyStartBlock,
  })

  if (mode === 'collapse-to-start') {
    const adjusted = startRef?.unref() ?? endRef?.unref() ?? null
    if (adjusted) {
      editor.select(adjusted)
    }
  } else {
    startRef?.unref()
    endRef?.unref()
  }

  if (
    reverse &&
    unit === 'character' &&
    collapsedInput &&
    removedText &&
    removedText.length > 1 &&
    COMPOUND_SCRIPT_REGEX.test(removedText)
  ) {
    const reinsert = removedText.slice(0, removedText.length - 1)
    if (editor.selection) {
      const {path, offset} = editor.selection.anchor
      editor.apply({type: 'insert_text', path, offset, text: reinsert})
    }
  }
}

interface MutateOptions {
  capture: boolean
  removeEmptyStartBlock: boolean
}

/**
 * Classify the resolved range and dispatch to the appropriate mutator:
 *
 * - Both endpoints inside the same block: trim text, possibly across spans.
 * - Endpoints in sibling blocks under the same parent: trim each block's
 *   partial content and merge the end block into the start.
 * - Endpoints under different parents (e.g. one inside an editable
 *   container): trim each end's partial content and leave the two block
 *   shells alone (no cross-parent merge).
 */
function mutateRange(
  editor: PortableTextSlateEditor,
  range: Range,
  options: MutateOptions,
): string | null {
  const {capture, removeEmptyStartBlock} = options

  const [start, end] = rangeEdges(range, {}, editor)

  const startBlock = getEnclosingBlock(editor, start.path)
  const endBlock = getEnclosingBlock(editor, end.path)

  if (!startBlock || !endBlock) {
    return null
  }

  if (pathEquals(startBlock.path, endBlock.path)) {
    return deleteSameBlockRange(editor, start, end, capture)
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
      removeEmptyStartBlock,
    )
    return null
  }

  deleteCrossParentRange(editor, startBlock.path, endBlock.path, start, end)
  return null
}

/**
 * Delete a range whose endpoints share the same parent block. Handles the
 * three sub-cases: same span (just trim text), different spans (trim and
 * splice), and either endpoint inside a void inline object (unset).
 */
function deleteSameBlockRange(
  editor: PortableTextSlateEditor,
  start: Point,
  end: Point,
  capture: boolean,
): string | null {
  if (pathEquals(start.path, end.path)) {
    return removeTextRange(
      editor,
      start.path,
      start.offset,
      end.offset,
      capture,
    )
  }

  const startEntry = getNode(editor, start.path)
  if (startEntry && isVoidNode(editor, startEntry.node, start.path)) {
    editor.apply({type: 'unset', path: start.path})
    return null
  }

  const removed = removeTextFromOffset(
    editor,
    start.path,
    start.offset,
    capture,
  )
  removeChildrenBetween(editor, start.path, end.path)

  const adjustedEnd = getSibling(editor, start.path, 'next')
  if (!adjustedEnd) {
    return removed
  }

  if (isVoidNode(editor, adjustedEnd.node, adjustedEnd.path)) {
    editor.apply({type: 'unset', path: adjustedEnd.path})
    return removed
  }

  removeTextUpToOffset(editor, adjustedEnd.path, end.offset)
  return removed
}

/**
 * Delete a range that crosses block boundaries within the same parent.
 * Trims partial content from the start and end blocks, unsets any blocks
 * fully inside the range, and merges the end block into the start (unless
 * either end is a void block, which is removed atomically).
 */
function deleteSameParentCrossBlockRange(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
  removeEmptyStartBlock: boolean,
): void {
  const startBlockNode = getNode(editor, startBlockPath)
  const endBlockNode = getNode(editor, endBlockPath)
  const startIsVoid =
    startBlockNode != null &&
    isVoidNode(editor, startBlockNode.node, startBlockPath)
  const endIsVoid =
    endBlockNode != null && isVoidNode(editor, endBlockNode.node, endBlockPath)

  // Trim the start block's tail (unless start is void or the range begins
  // at the block boundary).
  if (!startIsVoid) {
    if (pathEquals(start.path, startBlockPath)) {
      // Block-level start (e.g. `[{_key: blockKey}]:0`): the range begins
      // at the block boundary, so every child should be cleared.
      removeAllChildren(editor, startBlockPath)
    } else {
      removeTextFromOffset(editor, start.path, start.offset, false)
      removeTrailingChildren(editor, start.path)
    }
  }

  // Remove every block strictly between start and end.
  removeBlocksBetween(editor, startBlockPath, endBlockPath)

  // Both endpoints void: unset both shells, nothing to merge.
  if (startIsVoid && endIsVoid) {
    removeNodeAt(editor, endBlockPath)
    removeNodeAt(editor, startBlockPath)
    return
  }

  // Start void, end text: unset the start shell and trim the end block in
  // place. No merge because start no longer exists.
  if (startIsVoid) {
    if (!pathEquals(end.path, endBlockPath)) {
      removeLeadingChildrenOf(editor, endBlockPath, end.path)
      const firstChild = getFirstChild(editor, endBlockPath)
      if (firstChild) {
        removeTextUpToOffset(editor, firstChild.path, end.offset)
      }
    }
    removeNodeAt(editor, startBlockPath)
    return
  }

  // Start text, end void: unset the end shell. Preserve the start block's
  // shell at the user's chosen boundary.
  if (endIsVoid) {
    removeNodeAt(editor, endBlockPath)
    return
  }

  // Both text: trim the end block, then merge it into the start.
  const adjustedEndBlock = getSibling(editor, startBlockPath, 'next')
  const adjustedEndBlockPath = adjustedEndBlock?.path ?? startBlockPath

  if (!pathEquals(end.path, endBlockPath)) {
    removeLeadingChildrenOf(editor, adjustedEndBlockPath, end.path)
    const firstChild = getFirstChild(editor, adjustedEndBlockPath)
    if (firstChild) {
      removeTextUpToOffset(editor, firstChild.path, end.offset)
    }
  }

  mergeBlock(
    editor,
    startBlockPath,
    adjustedEndBlockPath,
    removeEmptyStartBlock,
  )
}

/**
 * Delete a range whose endpoints live under different parents (e.g. one
 * inside an editable container, one outside). Trims partial content from
 * each end and leaves the two block shells in place. No merge happens, since the
 * shells aren't siblings.
 */
function deleteCrossParentRange(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
  start: Point,
  end: Point,
): void {
  if (!pathEquals(start.path, startBlockPath)) {
    removeTextFromOffset(editor, start.path, start.offset, false)
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

/** Remove text in `[startOffset, endOffset)` from the span at `path`. */
function removeTextRange(
  editor: PortableTextSlateEditor,
  path: Path,
  startOffset: number,
  endOffset: number,
  capture: boolean,
): string | null {
  const span = getSpanNode(editor, path)
  if (!span) {
    return null
  }
  const text = span.node.text.slice(startOffset, endOffset)
  if (text.length === 0) {
    return null
  }
  editor.apply({type: 'remove_text', path, offset: startOffset, text})
  return capture ? text : null
}

/** Remove text from `offset` to the end of the span at `path`. */
function removeTextFromOffset(
  editor: PortableTextSlateEditor,
  path: Path,
  offset: number,
  capture: boolean,
): string | null {
  const span = getSpanNode(editor, path)
  if (!span || offset >= span.node.text.length) {
    return null
  }
  const text = span.node.text.slice(offset)
  editor.apply({type: 'remove_text', path, offset, text})
  return capture ? text : null
}

/** Remove text from offset 0 up to (but not including) `offset`. */
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

/**
 * Remove every sibling strictly between `startChildPath` and
 * `endChildPath`. Both paths must share the same parent.
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

/** Remove every sibling that comes after `startChildPath`. */
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
 * Remove every child of the block at `blockPath`. Used when a delete range
 * starts at the block boundary itself (block-level path with offset 0), so
 * the entire block content is consumed.
 */
function removeAllChildren(
  editor: PortableTextSlateEditor,
  blockPath: Path,
): void {
  let firstChild = getFirstChild(editor, blockPath)
  while (firstChild) {
    removeNodeAt(editor, firstChild.path)
    firstChild = getFirstChild(editor, blockPath)
  }
}

/**
 * Remove leading children from `blockPath` until `endChildPath` is the
 * first child.
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
 * Remove every sibling block strictly between `startBlockPath` and
 * `endBlockPath`. Both paths must share the same parent.
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

/**
 * Merge `endBlockPath` into `startBlockPath`, carrying over any new
 * `markDefs`. When `removeEmptyStartBlock` is set and the start block has
 * no content left, the start block is removed instead so the end block's
 * formatting (style, listItem) survives.
 */
function mergeBlock(
  editor: PortableTextSlateEditor,
  startBlockPath: Path,
  endBlockPath: Path,
  removeEmptyStartBlock: boolean,
): void {
  if (pathEquals(startBlockPath, endBlockPath)) {
    return
  }
  const startBlock = getTextBlockNode(editor, startBlockPath)
  const endBlock = getTextBlockNode(editor, endBlockPath)
  if (!startBlock || !endBlock) {
    return
  }

  if (
    removeEmptyStartBlock &&
    isEmptyTextBlock({schema: editor.schema}, startBlock.node)
  ) {
    // If the end block also ends up empty, the range covered both blocks
    // completely. Drop the end block so the start block's formatting wins on
    // the remaining empty block. Otherwise drop the empty start so the end
    // block's content survives.
    if (isEmptyTextBlock({schema: editor.schema}, endBlock.node)) {
      removeNodeAt(editor, endBlockPath)
      return
    }
    removeNodeAt(editor, startBlockPath)
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
