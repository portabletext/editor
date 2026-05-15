import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getChildren} from './get-children'
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
  const children = getChildren(snapshot, path)

  return children.at(-1)
}
