import type {Point} from '../interfaces/point'
import {comparePaths} from '../path/compare-paths'

export function comparePoints(point: Point, another: Point): -1 | 0 | 1 {
  const result = comparePaths(point.path, another.path)

  if (result === 0) {
    if (point.offset < another.offset) {
      return -1
    }
    if (point.offset > another.offset) {
      return 1
    }
    return 0
  }

  return result
}
