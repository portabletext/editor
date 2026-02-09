import {Point, type Operation, type Range} from 'slate'
import type {SplitContext} from '../types/slate-editor'

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
 * With split context, we detect when a range's endpoint was in the deleted
 * region and proactively compute where it will end up in the new block.
 *
 * @param range - The range to transform
 * @param operation - The Slate operation being applied
 * @param splitContext - Context about the split operation (if any)
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

  // During remove_text in a split, intercept and handle specially
  if (operation.type === 'remove_text') {
    // Check if the operation is on the block being split
    if (operation.path[0] === originalBlockIndex) {
      // Transform both anchor and focus considering the split
      const newAnchor = transformPointForSplit(
        range.anchor,
        operation,
        splitContext,
        originalBlockIndex,
        getNewBlockIndex,
      )
      const newFocus = transformPointForSplit(
        range.focus,
        operation,
        splitContext,
        originalBlockIndex,
        getNewBlockIndex,
      )

      // If either point is null, the range is invalid
      if (newAnchor === null || newFocus === null) {
        return null
      }

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

  // During insert_node for the new block, adjust paths of ranges that
  // were already moved to the new block position
  if (operation.type === 'insert_node') {
    const newBlockIndex = getNewBlockIndex()
    if (newBlockIndex !== undefined && operation.path[0] === newBlockIndex) {
      // Ranges that were pre-transformed to the new block position
      // don't need further adjustment - they're already pointing
      // to where the content will be
      return range
    }
  }

  // Default: use normal transformation
  return moveRangeByOperation(range, operation)
}

/**
 * Transform a point during a split's remove_text operation.
 *
 * If the point is at or after the split offset in the original block,
 * it will move to the new block at an adjusted offset.
 *
 * Otherwise, use normal Point.transform behavior.
 */
function transformPointForSplit(
  point: Point,
  operation: Extract<Operation, {type: 'remove_text'}>,
  splitContext: SplitContext,
  originalBlockIndex: number,
  getNewBlockIndex: () => number | undefined,
): Point | null {
  // Only handle points on the original block
  if (point.path[0] !== originalBlockIndex) {
    // Use normal transformation for other blocks
    return Point.transform(point, operation)
  }

  // Check if point is in the region being split (strictly after split offset)
  // The split offset is where the text deletion starts.
  // Points at exactly the split offset stay in the original block —
  // they mark a position in the existing text, not the new content.
  if (point.offset > splitContext.splitOffset) {
    const newBlockIndex = getNewBlockIndex()

    if (newBlockIndex === undefined) {
      // Can't determine new block position - fall back to normal transform
      return Point.transform(point, operation)
    }

    // Move point to the new block
    // The new offset is relative to the start of the new block
    return {
      path: [newBlockIndex, point.path[1] ?? 0],
      offset: point.offset - splitContext.splitOffset,
    }
  }

  // Point is before the split - use normal transformation
  // (which should leave it unchanged since it's before the deletion)
  return Point.transform(point, operation)
}
