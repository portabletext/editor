import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {getChildrenAt} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the first child of a node at a given path.
 *
 * @beta
 */
export function getFirstChild(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  return getChildrenAt(snapshot, path).at(0)
}
