import type {Range} from '../interfaces/range'
import {isBeforePoint} from '../point/is-before-point'
import {rangeEdges} from './range-edges'

export function rangeIntersection(range: Range, another: Range): Range | null {
  const {anchor: _anchor, focus: _focus, ...rest} = range
  const [s1, e1] = rangeEdges(range)
  const [s2, e2] = rangeEdges(another)
  const start = isBeforePoint(s1, s2) ? s2 : s1
  const end = isBeforePoint(e1, e2) ? e1 : e2

  if (isBeforePoint(end, start)) {
    return null
  } else {
    return {anchor: start, focus: end, ...rest}
  }
}
