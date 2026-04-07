import type {Node} from '../interfaces/node'
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
  root?: {children: Array<Node>},
): boolean {
  if (isRange(target)) {
    if (
      rangeIncludes(range, target.anchor, root) ||
      rangeIncludes(range, target.focus, root)
    ) {
      return true
    }

    const [rs, re] = rangeEdges(range, {}, root)
    const [ts, te] = rangeEdges(target, {}, root)
    return isBeforePoint(rs, ts, root) && isAfterPoint(re, te, root)
  }

  const [start, end] = rangeEdges(range, {}, root)
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
