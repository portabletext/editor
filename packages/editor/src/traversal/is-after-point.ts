import type {EditorSelectionPoint} from '../types/editor'
import {comparePoints} from './compare-points'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns true if `pointA` is after `pointB` in document order.
 *
 * Resolves at any depth. When the paths are equal, compares offsets.
 *
 * @beta
 */
export function isAfterPoint(
  snapshot: TraversalSnapshot,
  pointA: EditorSelectionPoint,
  pointB: EditorSelectionPoint,
): boolean {
  return comparePoints(snapshot, pointA, pointB) > 0
}
