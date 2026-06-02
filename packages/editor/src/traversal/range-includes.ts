import {comparePaths} from '../engine/path/compare-paths'
import {comparePoints} from '../engine/point/compare-points'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {isPoint} from '../engine/point/is-point'
import {isRange} from '../engine/range/is-range'
import {rangeEdges} from '../engine/range/range-edges'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {Path} from '../types/paths'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns true if `range` includes the supplied `target`. The target may be
 * a `Path`, an `EditorSelectionPoint`, or another `EditorSelection`.
 * "Includes" means partial intersection — two ranges that touch at a single
 * endpoint share that point and are considered overlapping.
 *
 * Pass `snapshot.context.selection` as `range` to ask the question against
 * the editor's current selection.
 *
 * Returns `false` when either `range` or `target` is `null`.
 *
 * @beta
 */
export function rangeIncludes(
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
      rangeIncludes(snapshot, range, target.anchor) ||
      rangeIncludes(snapshot, range, target.focus)
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
    isAfterStart = comparePoints(target, start, root) >= 0
    isBeforeEnd = comparePoints(target, end, root) <= 0
  } else {
    isAfterStart = comparePaths(target, start.path, root) >= 0
    isBeforeEnd = comparePaths(target, end.path, root) <= 0
  }

  return isAfterStart && isBeforeEnd
}
