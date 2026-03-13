import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'
import {rangeEdges} from './range-edges'

export function rangeStart(range: Range): Point {
  const [start] = rangeEdges(range)
  return start
}
