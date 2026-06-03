import {comparePoints} from '../engine/point/compare-points'
import {rangeEdges} from '../engine/range/range-edges'
import type {EditorSelection} from '../types/editor'
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
  const root = {value: snapshot.context.value}
  const [startA, endA] = rangeEdges(rangeA, root)
  const [startB, endB] = rangeEdges(rangeB, root)
  return (
    comparePoints(startA, endB, root) <= 0 &&
    comparePoints(startB, endA, root) <= 0
  )
}
