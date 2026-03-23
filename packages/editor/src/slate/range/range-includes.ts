import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'
import {comparePaths} from '../path/compare-paths'
import {comparePoints} from '../point/compare-points'
import {isAfterPoint} from '../point/is-after-point'
import {isBeforePoint} from '../point/is-before-point'
import {isPoint} from '../point/is-point'
import {isRange} from './is-range'
import {rangeEdges} from './range-edges'

export function rangeIncludes(
  range: Range,
  target: Path | Point | Range,
): boolean {
  if (isRange(target)) {
    if (
      rangeIncludes(range, target.anchor) ||
      rangeIncludes(range, target.focus)
    ) {
      return true
    }

    const [rs, re] = rangeEdges(range)
    const [ts, te] = rangeEdges(target)
    return isBeforePoint(rs, ts) && isAfterPoint(re, te)
  }

  const [start, end] = rangeEdges(range)
  let isAfterStart = false
  let isBeforeEnd = false

  if (isPoint(target)) {
    isAfterStart = comparePoints(target, start) >= 0
    isBeforeEnd = comparePoints(target, end) <= 0
  } else {
    isAfterStart = comparePaths(target, start.path) >= 0
    isBeforeEnd = comparePaths(target, end.path) <= 0
  }

  return isAfterStart && isBeforeEnd
}
