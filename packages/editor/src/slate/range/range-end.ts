import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'
import {rangeEdges} from './range-edges'

export function rangeEnd(range: Range): Point {
  const [, end] = rangeEdges(range)
  return end
}
