import type {PathSegment} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

export function isEqualPathSegments(
  segA: PathSegment | undefined,
  segB: PathSegment | undefined,
): boolean {
  if (segA === segB) {
    return true
  }

  if (segA === undefined || segB === undefined) {
    return false
  }

  if (
    (typeof segA === 'string' || typeof segA === 'number') &&
    (typeof segB === 'string' || typeof segB === 'number')
  ) {
    return segA === segB
  }

  if (isKeyedSegment(segA) && isKeyedSegment(segB)) {
    return segA._key === segB._key
  }

  if (Array.isArray(segA) && Array.isArray(segB)) {
    return segA[0] === segB[0] && segA[1] === segB[1]
  }

  return false
}
