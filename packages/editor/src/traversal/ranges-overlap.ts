import type {EditorSelection} from '../types/editor'
import {comparePoints} from './compare-points'
import {getRangeEdges} from './get-range-edges'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns true if the two selections share at least one point.
 *
 * Two selections overlap iff each one's start lies at or before the other's
 * end. Adjacent selections that touch at a single point are considered
 * overlapping.
 *
 * Returns `false` when either selection is `null`.
 *
 * @beta
 */
export function rangesOverlap(
  snapshot: TraversalSnapshot,
  rangeA: EditorSelection,
  rangeB: EditorSelection,
): boolean {
  if (!rangeA || !rangeB) {
    return false
  }
  const [startA, endA] = getRangeEdges(snapshot, rangeA)
  const [startB, endB] = getRangeEdges(snapshot, rangeB)
  return (
    comparePoints(snapshot, startA, endB) <= 0 &&
    comparePoints(snapshot, startB, endA) <= 0
  )
}
