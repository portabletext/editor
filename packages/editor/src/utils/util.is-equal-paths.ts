import type {Path} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function isEqualPaths(a: Path, b: Path): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    const segA = a.at(i)
    const segB = b.at(i)

    if (
      (typeof segA === 'string' || typeof segA === 'number') &&
      (typeof segB === 'string' || typeof segB === 'number')
    ) {
      if (segA !== segB) {
        return false
      }

      continue
    }

    if (isKeyedSegment(segA) && isKeyedSegment(segB)) {
      if (segA._key !== segB._key) {
        return false
      }

      continue
    }

    if (Array.isArray(segA) && Array.isArray(segB)) {
      if (segA.at(0) !== segB.at(0) || segA.at(1) !== segB.at(1)) {
        return false
      }

      continue
    }

    return false
  }

  return true
}
