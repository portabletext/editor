import type {Node} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import {isBeforePoint} from '../point/is-before-point'
import {rangeEdges} from './range-edges'
import {rangesOverlap} from './ranges-overlap'

export function rangeIntersection(
  range: Range,
  another: Range,
  root: {value: Array<Node>},
): Range | null {
  if (!rangesOverlap(range, another, root)) {
    return null
  }
  const {anchor: _anchor, focus: _focus, ...rest} = range
  const [s1, e1] = rangeEdges(range, root)
  const [s2, e2] = rangeEdges(another, root)
  const start = isBeforePoint(s1, s2, root) ? s2 : s1
  const end = isBeforePoint(e1, e2, root) ? e1 : e2
  return {anchor: start, focus: end, ...rest}
}
