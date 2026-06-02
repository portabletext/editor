import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Returns true if `ancestor` is equal to `descendant`, or if `descendant`
 * lives anywhere inside `ancestor`'s subtree.
 *
 * @beta
 */
export function pathContains(ancestor: Path, descendant: Path): boolean {
  if (ancestor.length > descendant.length) {
    return false
  }

  for (let i = 0; i < ancestor.length; i++) {
    const segment = ancestor[i]
    const otherSegment = descendant[i]

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
