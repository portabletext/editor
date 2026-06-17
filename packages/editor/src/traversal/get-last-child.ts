import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {getChildrenAt} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the last child of a node at a given path.
 *
 * @beta
 */
export function getLastChild(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  const children = getChildrenAt(snapshot, path)

  return children.at(-1)
}
