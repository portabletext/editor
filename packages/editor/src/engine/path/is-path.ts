import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

export function isPath(value: any): value is Path {
  return (
    Array.isArray(value) &&
    (value.length === 0 ||
      typeof value[0] === 'number' ||
      typeof value[0] === 'string' ||
      isKeyedSegment(value[0]))
  )
}
