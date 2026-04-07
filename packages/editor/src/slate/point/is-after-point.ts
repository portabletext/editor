import type {Node} from '../interfaces/node'
import type {Point} from '../interfaces/point'
import {comparePoints} from './compare-points'

export function isAfterPoint(
  point: Point,
  another: Point,
  root?: {children: Array<Node>},
): boolean {
  return comparePoints(point, another, root) === 1
}
