import type {EditorSnapshot} from '../editor/editor-snapshot'
import {comparePaths} from '../slate/path/compare-paths'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * Returns:
 *
 * - `-1` if `pointA` is before `pointB`
 * - `0` if `pointA` and `pointB` are equal
 * - `1` if `pointA` is after `pointB`.
 *
 * Compares the two points by document order, resolved at any depth. When
 * the paths are equal, compares offsets.
 */
export function comparePoints(
  snapshot: EditorSnapshot,
  pointA: EditorSelectionPoint,
  pointB: EditorSelectionPoint,
): -1 | 0 | 1 {
  const pathComparison = comparePaths(pointA.path, pointB.path, {
    children: snapshot.context.value,
  })

  if (pathComparison !== 0) {
    return pathComparison
  }

  if (pointA.offset < pointB.offset) {
    return -1
  }

  if (pointA.offset > pointB.offset) {
    return 1
  }

  return 0
}
