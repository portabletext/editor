import type {Point} from '../interfaces/point'
import {pathEquals} from '../path/path-equals'

export function pointEquals(point: Point, another: Point): boolean {
  return point.offset === another.offset && pathEquals(point.path, another.path)
}
