import type {Point} from '../interfaces/point'
import {comparePoints} from './compare-points'

export function isAfterPoint(point: Point, another: Point): boolean {
  return comparePoints(point, another) === 1
}
