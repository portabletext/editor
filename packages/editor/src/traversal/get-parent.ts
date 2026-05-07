import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the parent of a node at a given path.
 *
 * @beta
 */
export function getParent(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  if (path.length === 0) {
    return undefined
  }

  const parent = parentPath(path)

  if (parent.length === 0) {
    return undefined
  }

  return getNode(snapshot, parent)
}
