import {Point, type Node, type Operation, type Range} from '../slate'
import type {MergeContext, SplitContext} from '../types/slate-editor'

// Mock node for insert_node operations - only path matters for Point.transform
const mockNode = {children: []} as unknown as Node

export function moveRangeByOperation(
  range: Range,
  operation: Operation,
): Range | null {
  const anchor = Point.transform(range.anchor, operation)
  const focus = Point.transform(range.focus, operation)

  if (anchor === null || focus === null) {
    return null
  }

  if (Point.equals(anchor, range.anchor) && Point.equals(focus, range.focus)) {
    return range
  }

  return {anchor, focus}
}

/**
 * Move a range by an operation, with awareness of split context.
 *
 * This is specifically needed for the `insert.break` code path, which emits:
 * 1. remove_text - deletes text from split point to end of block
 * 2. insert_node - inserts the new block with that text
 *
 * Without split context, Point.transform clamps decorations at the deletion
 * boundary, losing their position relative to the moved text.
 *
 * With split context, we:
 * - During remove_text: Return the range UNCHANGED. This preserves the original
 *   offsets so we can correctly compute positions in the new block.
 * - During insert_node: Use original offsets to determine which points should
 *   move to the new block and at what offset.
 *
 * NOTE: Other split paths (e.g., block object insertion via operation.insert.block.ts)
 * use Slate's split_node operation instead of remove_text + insert_node.
 * Point.transform handles split_node correctly out of the box, so those paths
 * do NOT need splitContext — the default moveRangeByOperation is sufficient.
 *
 * @param range - The range to transform
 * @param operation - The Slate operation being applied
 * @param splitContext - Context about the split operation (if any)
 * @param originalBlockIndex - Index of the block being split
 * @param getNewBlockIndex - Function to get the index where the new block will be inserted
 * @returns The transformed range, or null if the range should be removed
 */
export function moveRangeBySplitAwareOperation(
  range: Range,
  operation: Operation,
  splitContext: SplitContext | null,
  originalBlockIndex: number | undefined,
  getNewBlockIndex: () => number | undefined,
): Range | null {
  // If no split context, fall back to normal behavior
  if (!splitContext || originalBlockIndex === undefined) {
    return moveRangeByOperation(range, operation)
  }

  // During remove_text in a split, DON'T transform - keep original offsets.
  // We need the original offsets to correctly compute positions in the new block.
  if (operation.type === 'remove_text') {
    if (operation.path[0] === originalBlockIndex) {
      // Return the range unchanged - preserve original offsets for insert_node
      return range
    }
  }

  // During insert_node for the new block, compute the correct positions
  // using the original (un-clamped) offsets.
  if (operation.type === 'insert_node') {
    const newBlockIndex = getNewBlockIndex()

    // Check if this is the insert for the new split block
    if (newBlockIndex !== undefined && operation.path[0] === newBlockIndex) {
      // Transform points using original offsets
      const newAnchor = adjustPointAfterSplit(
        range.anchor,
        splitContext,
        originalBlockIndex,
        newBlockIndex,
        'anchor',
      )
      const newFocus = adjustPointAfterSplit(
        range.focus,
        splitContext,
        originalBlockIndex,
        newBlockIndex,
        'focus',
      )

      // If nothing changed, return original range
      if (
        Point.equals(newAnchor, range.anchor) &&
        Point.equals(newFocus, range.focus)
      ) {
        return range
      }

      return {anchor: newAnchor, focus: newFocus}
    }
  }

  // Default: use normal transformation
  return moveRangeByOperation(range, operation)
}

/**
 * Adjust a point after a split operation, using original (un-clamped) offsets.
 *
 * Since we skip transformation during remove_text, we have the original offsets
 * and can correctly determine:
 * - Points before splitOffset: stay in original block (at same offset)
 * - Points after splitOffset: move to new block at (offset - splitOffset)
 * - Points AT splitOffset: depends on role:
 *   - anchor: moves to new block at offset 0 (the text it starts decorating moved)
 *   - focus: stays in original block (the text it ends decorating is before the split)
 */
function adjustPointAfterSplit(
  point: Point,
  splitContext: SplitContext,
  originalBlockIndex: number,
  newBlockIndex: number,
  role: 'anchor' | 'focus',
): Point {
  // Only adjust points on the original block
  if (point.path[0] !== originalBlockIndex) {
    // Point is on a different block - just apply the insert_node path shift
    return (
      Point.transform(point, {
        type: 'insert_node',
        path: [newBlockIndex],
        node: mockNode,
      }) ?? point
    )
  }

  const {splitOffset} = splitContext

  // Point is before the split offset - stays in original block.
  // Points AT the split offset depend on role:
  // - focus at splitOffset: stays (decoration ends at the split boundary)
  // - anchor at splitOffset: moves to new block (decoration starts at text that moved)
  if (
    point.offset < splitOffset ||
    (point.offset === splitOffset && role === 'focus')
  ) {
    // Apply path shift from insert_node (blocks after original get shifted)
    return (
      Point.transform(point, {
        type: 'insert_node',
        path: [newBlockIndex],
        node: mockNode,
      }) ?? point
    )
  }

  // Point is after split offset - moves to new block
  // The new offset is (original offset - split offset)
  // Example: split at 11, point at 25 -> new offset is 14
  return {
    path: [newBlockIndex, point.path[1] ?? 0],
    offset: point.offset - splitOffset,
  }
}

/**
 * Move a range by an operation, with awareness of merge context.
 *
 * During a block merge operation (forward-delete or backspace), the editor emits:
 * 1. remove_node - deletes the block that's being merged away
 * 2. insert_node - re-inserts the children into the target block
 *
 * Without merge context, remove_node invalidates decorations on the deleted block
 * even though the text is about to be re-inserted.
 *
 * With merge context, we:
 * - During remove_node: Preserve points on the deleted block unchanged while
 *   letting Point.transform shift other points normally. This produces a "mixed"
 *   range that avoids both invalidation and stale-path issues.
 * - During insert_node: Adjust points that were on the deleted block to their
 *   new positions in the target block. Uses pre-computed flags (from the
 *   remove_node phase) to avoid false positives from path collisions.
 *
 * @param range - The range to transform
 * @param operation - The Slate operation being applied
 * @param mergeContext - Context about the merge operation (if any)
 * @param deletedBlockIndex - Index of the block being deleted
 * @param targetBlockIndex - Index of the block receiving the content
 * @param mergeDeletedBlockFlags - Pre-computed flags indicating which points
 *   were on the deleted block before remove_node shifted paths. When provided,
 *   these are used instead of the stale `path[0] === deletedBlockIndex` check.
 * @returns The transformed range, or null if the range should be removed
 */
export function moveRangeByMergeAwareOperation(
  range: Range,
  operation: Operation,
  mergeContext: MergeContext | null,
  deletedBlockIndex: number | undefined,
  targetBlockIndex: number | undefined,
  mergeDeletedBlockFlags?: {anchor: boolean; focus: boolean} | null,
): Range | null | undefined {
  // If no merge context, return undefined to signal caller should use default behavior
  if (
    !mergeContext ||
    deletedBlockIndex === undefined ||
    targetBlockIndex === undefined
  ) {
    return undefined
  }

  // During remove_node for the deleted block, DON'T invalidate decorations on it.
  // We need to preserve the positions so we can map them after re-insertion.
  // For points NOT on the deleted block, apply Point.transform normally so their
  // paths stay correct. This "mixed" approach avoids stale-index collisions where
  // a shifted point at `deletedBlockIndex` is later mistaken for a deleted-block point.
  if (operation.type === 'remove_node') {
    if (
      operation.path.length === 1 &&
      operation.path[0] === deletedBlockIndex
    ) {
      const anchorOnDeleted = range.anchor.path[0] === deletedBlockIndex
      const focusOnDeleted = range.focus.path[0] === deletedBlockIndex

      if (anchorOnDeleted || focusOnDeleted) {
        const newAnchor = anchorOnDeleted
          ? range.anchor
          : (Point.transform(range.anchor, operation) ?? range.anchor)
        const newFocus = focusOnDeleted
          ? range.focus
          : (Point.transform(range.focus, operation) ?? range.focus)

        if (
          Point.equals(newAnchor, range.anchor) &&
          Point.equals(newFocus, range.focus)
        ) {
          return range
        }

        return {anchor: newAnchor, focus: newFocus}
      }
    }
  }

  // During insert_node for the merged children, adjust points from the deleted block
  // to their new positions in the target block.
  if (operation.type === 'insert_node') {
    const insertedChildIndex = operation.path[1]
    if (
      operation.path.length === 2 &&
      operation.path[0] === targetBlockIndex &&
      insertedChildIndex !== undefined
    ) {
      // Use pre-computed flags when available to avoid false positives.
      // After remove_node, Point.transform shifts paths > deletedBlockIndex
      // down by 1, so a point originally at deletedBlockIndex+1 now sits at
      // deletedBlockIndex — colliding with preserved deleted-block points.
      // The flags were computed BEFORE remove_node, so they're authoritative.
      const anchorOnDeleted =
        mergeDeletedBlockFlags?.anchor ??
        range.anchor.path[0] === deletedBlockIndex
      const focusOnDeleted =
        mergeDeletedBlockFlags?.focus ??
        range.focus.path[0] === deletedBlockIndex

      if (anchorOnDeleted || focusOnDeleted) {
        const newAnchor = anchorOnDeleted
          ? adjustPointAfterMerge(
              range.anchor,
              deletedBlockIndex,
              targetBlockIndex,
              insertedChildIndex,
              mergeContext.targetOriginalChildCount,
            )
          : range.anchor
        const newFocus = focusOnDeleted
          ? adjustPointAfterMerge(
              range.focus,
              deletedBlockIndex,
              targetBlockIndex,
              insertedChildIndex,
              mergeContext.targetOriginalChildCount,
            )
          : range.focus

        if (
          Point.equals(newAnchor, range.anchor) &&
          Point.equals(newFocus, range.focus)
        ) {
          return range
        }

        return {anchor: newAnchor, focus: newFocus}
      }
    }
  }

  // Return undefined to signal caller should use default behavior
  return undefined
}

/**
 * Adjust a point after a merge operation.
 *
 * When a block is merged into another, children from the deleted block are
 * inserted sequentially into the target block. Child 0 from the deleted block
 * goes to index targetOriginalChildCount + 0, child 1 to
 * targetOriginalChildCount + 1, etc.
 *
 * Since insert_node events fire for each child individually, we check whether
 * the current insert_node corresponds to the child this point is on. If so,
 * we update the point's path. If not, we return unchanged — the correct
 * insert_node will come in a subsequent operation.
 *
 * @param point - The point to adjust
 * @param deletedBlockIndex - Index of the deleted block
 * @param targetBlockIndex - Index of the target block
 * @param insertedChildIndex - The index where the child was inserted in target
 * @param targetOriginalChildCount - Number of children in target before merge
 */
function adjustPointAfterMerge(
  point: Point,
  deletedBlockIndex: number,
  targetBlockIndex: number,
  insertedChildIndex: number,
  targetOriginalChildCount: number,
): Point {
  // Only adjust points on the deleted block
  if (point.path[0] !== deletedBlockIndex) {
    return point
  }

  const originalChildIndex = point.path[1] ?? 0

  // Child N from the deleted block is inserted at targetOriginalChildCount + N
  // in the target block. Check if this insert_node is for our child.
  const expectedInsertIndex = targetOriginalChildCount + originalChildIndex

  if (insertedChildIndex === expectedInsertIndex) {
    return {
      path: [targetBlockIndex, insertedChildIndex],
      offset: point.offset,
    }
  }

  // Not this child's insert_node yet — return unchanged, will be updated
  // when the correct insert_node fires
  return point
}
