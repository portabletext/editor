import type {Path} from '@portabletext/patches'
import type {Node} from './node'
import type {TraversalSnapshot} from './traversal-snapshot'
import {childEntries, walkedNode, walkPath} from './walk-path'
export {getNodeChildren} from './get-node-children'

/**
 * Get the children of a node at a given path.
 *
 * @public
 */
export function getChildren(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  const walk = walkPath(snapshot, path)
  const node = walkedNode(walk)

  if (walk.status !== 'found' || (walk.nodes.length > 0 && !node)) {
    return []
  }

  return childEntries(snapshot.context.value, node)
}
