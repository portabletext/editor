import type {Node} from '../engine/interfaces/node'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'

/**
 * Resolve a container node's editable child array.
 *
 * Returns `{children, container}` for a node registered as a container:
 * `children` is the node's editable child array, and `container` is the
 * node's own container registration. Read `container.field.name` for the
 * path segment that reaches `children`, and thread `container` back in as
 * `parent` when descending into them.
 *
 * Returns `undefined` for anything that is not a container: text blocks,
 * spans, leaves, and unregistered objects. It is node-based and resolves
 * in one step with no path re-walk, so recursive descent over containers
 * is linear in nesting depth. The caller seeds the document root from
 * `context.value` itself.
 *
 * @beta
 */
export function getContainerChildren(
  containers: Containers,
  node: Node,
  parent?: RegisteredContainer,
):
  | {
      children: Array<Node>
      container: RegisteredContainer
    }
  | undefined {
  const resolved = resolveNodeContainer(containers, parent, node)

  if (!resolved) {
    return undefined
  }

  const fieldValue = (node as Record<string, unknown>)[resolved.field.name]

  if (!Array.isArray(fieldValue)) {
    return undefined
  }

  return {
    children: fieldValue as Array<Node>,
    container: resolved,
  }
}

/**
 * Pick the positional override from `parent.of` if present; fall back
 * to the top-level entry. Returns only `RegisteredContainer` entries
 * since leaves do not have editable children.
 */
function resolveNodeContainer(
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
