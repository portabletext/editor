import type {Node} from '../engine/interfaces/node'
import type {Containers, RegisteredContainer} from './container-types'

/**
 * Resolve which container registration applies to a node held at a
 * known parent position.
 *
 * Pick the positional override from `parent.of` if present; fall back
 * to the top-level entry. Returns `undefined` when the node's `_type`
 * is not registered as a container at this position (unregistered, or
 * registered only as a leaf in `parent.of`).
 *
 * Node-based variant. The companion to {@link resolveContainerAt} for
 * consumers walking the value tree recursively; pass the resolved
 * parent down to the next level instead of re-walking from the root.
 *
 * @alpha
 */
export function resolveContainerOf(
  containers: Containers,
  parent: RegisteredContainer | undefined,
  node: Node,
): RegisteredContainer | undefined {
  if (parent?.of) {
    for (const entry of parent.of) {
      if (entry.type === node._type) {
        // Only return container entries; leaves have no editable children.
        if ('field' in entry) {
          return entry
        }
        return undefined
      }
    }
  }
  return containers.get(node._type)
}
