import type {EditorSelection} from '../types/editor'
import {getRangeEdges} from './get-range-edges'
import {isBeforePoint} from './is-before-point'
import {rangesOverlap} from './ranges-overlap'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns the intersection of two selections — the sub-selection covering
 * the points the two share — or `null` when they don't overlap.
 *
 * Returns `null` when either input is `null`.
 *
 * @beta
 */
export function getRangeIntersection<
  TRangeA extends NonNullable<EditorSelection> | null,
  TRangeB extends NonNullable<EditorSelection> | null,
>(
  snapshot: TraversalSnapshot,
  rangeA: TRangeA,
  rangeB: TRangeB,
): TRangeA extends null ? null : TRangeB extends null ? null : EditorSelection {
  type Return = TRangeA extends null
    ? null
    : TRangeB extends null
      ? null
      : EditorSelection
  if (!rangeA || !rangeB || !rangesOverlap(snapshot, rangeA, rangeB)) {
    return null as Return
  }
  const {anchor: _anchor, focus: _focus, ...rest} = rangeA
  const [s1, e1] = getRangeEdges(snapshot, rangeA)
  const [s2, e2] = getRangeEdges(snapshot, rangeB)
  const start = isBeforePoint(snapshot, s1, s2) ? s2 : s1
  const end = isBeforePoint(snapshot, e1, e2) ? e1 : e2
  return {anchor: start, focus: end, ...rest} as unknown as Return
}
