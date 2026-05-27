import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

export function isAncestorPath(path: Path, another: Path): boolean {
  if (path.length >= another.length) {
    return false
  }

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    const otherSegment = another[i]

    if (isKeyedSegment(segment) && isKeyedSegment(otherSegment)) {
      if (segment._key !== otherSegment._key) {
        return false
      }
    } else if (segment !== otherSegment) {
      return false
    }
  }

  return true
}
