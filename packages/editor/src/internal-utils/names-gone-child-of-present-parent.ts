import {getNode} from '../traversal/get-node'
import {getParent} from '../traversal/get-parent'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {EditorSelection} from '../types/editor'

/**
 * Whether one of the points of `at` names a node that has gone while the
 * parent of that node is still there.
 *
 * A range that names a block that has gone is not covered, and neither is a
 * point that already resolves. Works at any depth, including inside
 * containers.
 */
export function namesGoneChildOfPresentParent(
  snapshot: TraversalSnapshot,
  at: NonNullable<EditorSelection>,
): boolean {
  return [at.anchor, at.focus].some(
    (point) =>
      getParent(snapshot, point.path) !== undefined &&
      getNode(snapshot, point.path) === undefined,
  )
}
