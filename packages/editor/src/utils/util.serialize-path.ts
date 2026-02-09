import type {Path} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

export function serializePath(path: Path): string {
  return path
    .map((segment) => {
      if (isKeyedSegment(segment)) {
        return segment._key
      }

      return segment
    })
    .join('.')
}
