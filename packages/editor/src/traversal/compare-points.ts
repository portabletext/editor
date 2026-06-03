import {comparePaths} from '../engine/path/compare-paths'
import type {EditorSelectionPoint} from '../types/editor'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns:
 *
 * - `-1` if `pointA` is before `pointB`
 * - `0` if `pointA` and `pointB` are equal
 * - `1` if `pointA` is after `pointB`.
 *
 * Compares the two points by document order, resolved at any depth. When
 * the paths are equal, compares offsets.
 *
 * @beta
 */
export function comparePoints(
  snapshot: TraversalSnapshot,
  pointA: EditorSelectionPoint,
  pointB: EditorSelectionPoint,
): -1 | 0 | 1 {
  const pathComparison = comparePaths(pointA.path, pointB.path, {
    value: snapshot.context.value,
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
