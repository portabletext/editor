import type {Point} from '../interfaces/point'
import type {Range, RangeEdgesOptions} from '../interfaces/range'
import {isBackwardRange} from './is-backward-range'

export function rangeEdges(
  range: Range,
  options: RangeEdgesOptions = {},
): [Point, Point] {
  const {reverse = false} = options
  const {anchor, focus} = range
  return isBackwardRange(range) === reverse ? [anchor, focus] : [focus, anchor]
}
