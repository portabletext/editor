import type {Node} from '../interfaces/node'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'
import {isBackwardRange} from './is-backward-range'

export function rangeEdges(
  range: Range,
  root: {value: Array<Node>},
): [Point, Point] {
  const {anchor, focus} = range
  return isBackwardRange(range, root) ? [focus, anchor] : [anchor, focus]
}
