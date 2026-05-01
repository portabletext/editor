import type {Node} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import {comparePoints} from '../point/compare-points'
import {rangeEdges} from './range-edges'

/**
 * Returns true if the two ranges share at least one point.
 *
 * Two ranges overlap iff each one's start is at or before the other's end.
 * Adjacent ranges that touch at a single point are considered overlapping.
 */
export function rangesOverlap(
  rangeA: Range,
  rangeB: Range,
  root: {children: Array<Node>},
): boolean {
  const [startA, endA] = rangeEdges(rangeA, root)
  const [startB, endB] = rangeEdges(rangeB, root)
  return (
    comparePoints(startA, endB, root) <= 0 &&
    comparePoints(startB, endA, root) <= 0
  )
}
