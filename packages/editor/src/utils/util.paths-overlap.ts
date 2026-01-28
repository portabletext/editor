import type {Path} from '../types/paths'
import {isEqualPathSegments} from './util.is-equal-path-segments'

/**
 * Two paths overlap if they are equal or if one is the ancestor of the other.
 */
export function pathsOverlap(pathA: Path, pathB: Path): boolean {
  const minLength = Math.min(pathA.length, pathB.length)

  for (let i = 0; i < minLength; i++) {
    if (!isEqualPathSegments(pathA[i], pathB[i])) {
      return false
    }
  }

  return true
}
