import {Point, type Node, type Operation, type Range} from 'slate'
import type {SplitContext} from '../types/slate-editor'

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
 * During a block split operation, the editor emits:
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
      )
      const newFocus = adjustPointAfterSplit(
        range.focus,
        splitContext,
        originalBlockIndex,
        newBlockIndex,
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
 * - Points at splitOffset: stay in original block at splitOffset
 * - Points after splitOffset: move to new block at (offset - splitOffset)
 */
function adjustPointAfterSplit(
  point: Point,
  splitContext: SplitContext,
  originalBlockIndex: number,
  newBlockIndex: number,
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

  // Point is before or at the split offset - stays in original block
  if (point.offset <= splitOffset) {
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
