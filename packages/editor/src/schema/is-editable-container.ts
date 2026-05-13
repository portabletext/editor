import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {Node} from '../slate/interfaces/node'

/**
 * Check whether a node is a registered editable container.
 */
export function isEditableContainer(
  snapshot: TraversalSnapshot,
  node: Node,
): boolean {
  return snapshot.context.containers.has(node._type)
}
