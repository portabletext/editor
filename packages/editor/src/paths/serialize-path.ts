import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Serialize a keyed path to a string.
 */
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
