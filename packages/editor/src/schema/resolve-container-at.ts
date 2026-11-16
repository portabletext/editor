import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {walkNodes} from '../traversal/walk-path'
import {isNonArrayObject} from '../utils/is-non-array-object'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {
  Containers,
  RegisteredContainer,
  RegisteredPositional,
} from './container-types'

/**
 * Walk the editor value following `path` and return the
 * {@link RegisteredContainer} or {@link RegisteredPositional} that applies
 * at `path`'s target position.
 *
 * Resolution rules at each step:
 *
 * 1. **Positional override.** If the current parent declares the
 *    child's `_type` in its `of`, the positional entry wins.
 *    Used to resolve same-`_type` registered under different
 *    parents with different `field` values.
 *
 * 2. **Global fallback.** If the parent has no positional override,
 *    fall back to the top-level entry for `_type` in
 *    `containers`.
 *
 * 3. **Chain validity.** If any ancestor along the path has no
 *    resolved container entry (unregistered or not reachable as a
 *    container at its position), return `undefined`.
 *
 * Returns `undefined` when the target's `_type` is not registered
 * at this position. Returns a {@link RegisteredPositional} when the target
 * resolves to a leaf in a positional `of` (terminal node with no
 * editable children).
 *
 * @alpha
 */
export function resolveContainerAt(
  containers: Containers,
  value: ReadonlyArray<Node>,
  path: Path,
): RegisteredContainer | RegisteredPositional | undefined {
  const walk = walkNodes<RegisteredContainer>(
    value as Array<Node>,
    path,
    (node, parent) => {
      const resolved = resolveNodeEntry(containers, parent, node)
      if (!resolved || !('field' in resolved)) {
        return undefined
      }
      const fieldValue = (node as Record<string, unknown>)[resolved.field.name]
      return Array.isArray(fieldValue)
        ? {
            children: fieldValue as Array<Node>,
            fieldName: resolved.field.name,
            parent: resolved,
          }
        : undefined
    },
  )

  if (walk.status === 'invalid') {
    return undefined
  }

  // The target is the node at the last keyed segment, and every node above
  // it must resolve as a registered container at its position.
  const targetSegmentIndex = path.findLastIndex(isKeyedSegment)
  const targetNodeIndex = walk.nodes.findIndex(
    (node) => node.segmentIndex === targetSegmentIndex,
  )
  const target = walk.nodes[targetNodeIndex]

  if (
    !target ||
    walk.nodes
      .slice(0, targetNodeIndex)
      .some((node) => node.children === undefined)
  ) {
    return undefined
  }

  return resolveNodeEntry(containers, target.container, target.node)
}

function resolveNodeEntry(
  containers: Containers,
  parent: RegisteredContainer | undefined,
  node: Node,
): RegisteredContainer | RegisteredPositional | undefined {
  if (!isNonArrayObject(node)) {
    return undefined
  }
  if (parent?.of) {
    for (const entry of parent.of) {
      if (entry.type === node._type) {
        return entry
      }
    }
  }
  return containers.get(node._type)
}
