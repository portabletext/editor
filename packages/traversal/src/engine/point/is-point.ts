import type {Point} from '../interfaces/point'
import {isPath} from '../path/is-path'
import {isObject} from '../utils/is-object'

export function isPoint(value: any): value is Point {
  return (
    isObject(value) && typeof value.offset === 'number' && isPath(value.path)
  )
}
