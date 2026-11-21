import {comparePaths} from '../engine/path/compare-paths'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {isPoint} from '../engine/point/is-point'
import {isRange} from '../engine/range/is-range'
import {rangeEdges} from '../engine/range/range-edges'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {Path} from '../types/paths'
import {comparePoints} from './compare-points'
import {everyPath, compareEveryEntries} from './every-field'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkPath} from './walk-path'

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
 * Returns `false` when either `range` or `target` is `null`, or carries a
 * path that cannot address anything (two node segments side by side).
 *
 * @public
 */
export function rangeIntersects(
  snapshot: TraversalSnapshot,
  range: EditorSelection,
  target: Path | EditorSelectionPoint | EditorSelection,
): boolean {
  if (!range || target === null) {
    return false
  }

  const paths = [
    range.anchor.path,
    range.focus.path,
    ...(Array.isArray(target)
      ? [target]
      : isPoint(target)
        ? [target.path]
        : [target.anchor.path, target.focus.path]),
  ]

  if (snapshot.context.containers === undefined) {
    const canonical = paths.map((path) => everyPath(snapshot, path))
    if (canonical.some((entry) => entry.invalid)) {
      return false
    }
    const compare = (
      first: number,
      firstOffset: number,
      second: number,
      secondOffset: number,
    ) =>
      compareEveryEntries(canonical[first]!, canonical[second]!) ||
      Math.sign(firstOffset - secondOffset)
    const [start, end] =
      compare(0, range.anchor.offset, 1, range.focus.offset) <= 0
        ? [0, 1]
        : [1, 0]
    const offsets = [range.anchor.offset, range.focus.offset]
    if (Array.isArray(target)) {
      return (
        compareEveryEntries(canonical[2]!, canonical[start]!) >= 0 &&
        compareEveryEntries(canonical[2]!, canonical[end]!) <= 0
      )
    }
    if (isPoint(target)) {
      return (
        compare(2, target.offset, start, offsets[start]!) >= 0 &&
        compare(2, target.offset, end, offsets[end]!) <= 0
      )
    }
    const [targetStart, targetEnd] =
      compare(2, target.anchor.offset, 3, target.focus.offset) <= 0
        ? [2, 3]
        : [3, 2]
    const targetOffsets = [0, 0, target.anchor.offset, target.focus.offset]
    return (
      compare(targetStart, targetOffsets[targetStart]!, end, offsets[end]!) <=
        0 &&
      compare(targetEnd, targetOffsets[targetEnd]!, start, offsets[start]!) >= 0
    )
  }

  if (paths.some((path) => walkPath(snapshot, path).status === 'invalid')) {
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
