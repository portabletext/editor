import {comparePaths} from '../engine/path/compare-paths'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {isPoint} from '../engine/point/is-point'
import {isRange} from '../engine/range/is-range'
import {rangeEdges} from '../engine/range/range-edges'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {Path} from '../types/paths'
import {comparePoints} from './compare-points'
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

  const root = {value: snapshot.context.value}

  if (isRange(target)) {
    if (
      rangeIntersects(snapshot, range, target.anchor) ||
      rangeIntersects(snapshot, range, target.focus)
    ) {
      return true
    }
    const [rs, re] = rangeEdges(range, root)
    const [ts, te] = rangeEdges(target, root)
    return isBeforePoint(rs, ts, root) && isAfterPoint(re, te, root)
  }

  const [start, end] = rangeEdges(range, root)
  let isAfterStart = false
  let isBeforeEnd = false

  if (isPoint(target)) {
    isAfterStart = comparePoints(snapshot, target, start) >= 0
    isBeforeEnd = comparePoints(snapshot, target, end) <= 0
  } else {
    isAfterStart = comparePaths(target, start.path, root) >= 0
    isBeforeEnd = comparePaths(target, end.path, root) <= 0
  }

  return isAfterStart && isBeforeEnd
}
