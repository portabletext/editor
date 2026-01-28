import type {Path} from '../types/paths'
import {isEqualPathSegments} from './util.is-equal-path-segments'

/**
 * @public
 */
export function isEqualPaths(a: Path, b: Path): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    if (!isEqualPathSegments(a[i], b[i])) {
      return false
    }
  }

  return true
}
