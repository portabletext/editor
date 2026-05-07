import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {getContainerScopedName} from './get-container-scoped-name'

/**
 * Check if a node at the given path is a registered editable container.
 */
export function isEditableContainer(
  snapshot: TraversalSnapshot,
  node: Node,
  path: Path,
): boolean {
  if (snapshot.context.containers.size === 0) {
    return false
  }

  const scopedName = getContainerScopedName(snapshot, node, path)
  return snapshot.context.containers.has(scopedName)
}
