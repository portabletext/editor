import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'
import {parentPath} from './parent-path'
import {pathEquals} from './path-equals'

export function isSiblingPath(path: Path, another: Path): boolean {
  if (path.length !== another.length || path.length === 0) {
    return false
  }

  const lastA = path[path.length - 1]
  const lastB = another[another.length - 1]

  if (isKeyedSegment(lastA) && isKeyedSegment(lastB)) {
    return (
      lastA._key !== lastB._key &&
      pathEquals(parentPath(path), parentPath(another))
    )
  }

  return false
}
