import type {EditorSelectionPoint} from '../types/editor'
import {isEqualPaths} from './util.is-equal-paths'

/**
 * @public
 */
export function isEqualSelectionPoints(
  a: EditorSelectionPoint,
  b: EditorSelectionPoint,
) {
  return a.offset === b.offset && isEqualPaths(a.path, b.path)
}
