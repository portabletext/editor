import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

export function commonPath(path: Path, another: Path): Path {
  const common: Path = []

  for (let i = 0; i < path.length && i < another.length; i++) {
    const segment = path.at(i)
    const otherSegment = another.at(i)

    if (segment === undefined || otherSegment === undefined) {
      break
    }

    if (isKeyedSegment(segment) && isKeyedSegment(otherSegment)) {
      if (segment._key !== otherSegment._key) {
        break
      }
      common.push(segment)
    } else if (segment === otherSegment) {
      common.push(segment)
    } else {
      break
    }
  }

  return common
}
