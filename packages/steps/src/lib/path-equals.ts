import type {Path} from '@portabletext/patches'

import {isKeyedSegment} from './is-keyed-segment'

/**
 * A copy of `packages/editor/src/engine/path/path-equals.ts`, kept in sync
 * by hand.
 */
export function pathEquals(path: Path, another: Path): boolean {
  if (path.length !== another.length) {
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
