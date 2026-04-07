import type {Node} from '../interfaces/node'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'
import {rangeEdges} from './range-edges'

export function rangeStart(
  range: Range,
  root?: {children: Array<Node>},
): Point {
  const [start] = rangeEdges(range, {}, root)
  return start
}
