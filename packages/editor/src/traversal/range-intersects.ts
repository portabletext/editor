import {isPoint} from '../engine/point/is-point'
import {isRange} from '../engine/range/is-range'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {Path} from '../types/paths'
import {comparePaths} from './compare-paths'
import {comparePoints} from './compare-points'
import {getRangeEdges} from './get-range-edges'
import {isAfterPoint} from './is-after-point'
import {isBeforePoint} from './is-before-point'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns true if `range` and the supplied `target` intersect. The target
 * may be a `Path`, an `EditorSelectionPoint`, or another
 * `EditorSelection`.
 *
 * For a `Path` or `EditorSelectionPoint` target, "intersect" means the
 * target lies at or between `range`'s start and end edges (inclusive).
 *
 * For an `EditorSelection` target, "intersect" means either endpoint of
 * `target` lies inside `range`, or `range` strictly encloses `target`.
 *
 * Pass `snapshot.context.selection` as `range` to ask the question against
 * the editor's current selection.
 *
 * Returns `false` when either `range` or `target` is `null`.
 *
 * @beta
 */
export function rangeIntersects(
  snapshot: TraversalSnapshot,
  range: EditorSelection,
  target: Path | EditorSelectionPoint | EditorSelection,
): boolean {
  if (!range || target === null) {
    return false
  }

  if (isRange(target)) {
    if (
      rangeIntersects(snapshot, range, target.anchor) ||
      rangeIntersects(snapshot, range, target.focus)
    ) {
      return true
    }
    const [rs, re] = getRangeEdges(snapshot, range)
    const [ts, te] = getRangeEdges(snapshot, target)
    return isBeforePoint(snapshot, rs, ts) && isAfterPoint(snapshot, re, te)
  }

  const [start, end] = getRangeEdges(snapshot, range)
  let isAfterStart = false
  let isBeforeEnd = false

  if (isPoint(target)) {
    isAfterStart = comparePoints(snapshot, target, start) >= 0
    isBeforeEnd = comparePoints(snapshot, target, end) <= 0
  } else {
    isAfterStart = comparePaths(snapshot, target, start.path) >= 0
    isBeforeEnd = comparePaths(snapshot, target, end.path) <= 0
  }

  return isAfterStart && isBeforeEnd
}
