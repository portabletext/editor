import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {
  Containers,
  RegisteredContainer,
  RegisteredLeaf,
} from './container-types'

/**
 * Walk the editor value following `path` and return the
 * {@link RegisteredContainer} or {@link RegisteredLeaf} that applies
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
 * at this position. Returns a {@link RegisteredLeaf} when the target
 * resolves to a leaf in a positional `of` (terminal node with no
 * editable children).
 *
 * @alpha
 */
export function resolveContainerAt(
  containers: Containers,
  value: ReadonlyArray<Node>,
  path: Path,
): RegisteredContainer | RegisteredLeaf | undefined {
  const keyedIndices: Array<number> = []
  for (let index = 0; index < path.length; index++) {
    if (isKeyedSegment(path[index])) {
      keyedIndices.push(index)
    }
  }
  if (keyedIndices.length === 0) {
    return undefined
  }

  let currentChildren: ReadonlyArray<Node> = value
  let parent: RegisteredContainer | undefined
  let resolved: RegisteredContainer | RegisteredLeaf | undefined
  const targetKeyedIndex = keyedIndices[keyedIndices.length - 1]!

  let segmentIndex = 0
  while (segmentIndex <= targetKeyedIndex) {
    const segment = path[segmentIndex]!
    if (typeof segment === 'string') {
      segmentIndex++
      continue
    }

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      node = currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
    } else {
      return undefined
    }
    if (!node) {
      return undefined
    }

    resolved = resolveNodeEntry(containers, parent, node)
    if (!resolved) {
      return undefined
    }

    if (segmentIndex < targetKeyedIndex) {
      // Walk one more level. The resolved entry must be a container
      // (have children) for descent to continue.
      if (!('field' in resolved)) {
        return undefined
      }
      const fieldValue = (node as Record<string, unknown>)[resolved.field.name]
      if (!Array.isArray(fieldValue)) {
        return undefined
      }
      parent = resolved
      currentChildren = fieldValue as Array<Node>
    }
    segmentIndex++
  }

  return resolved
}

function resolveNodeEntry(
  containers: Containers,
  parent: RegisteredContainer | undefined,
  node: Node,
): RegisteredContainer | RegisteredLeaf | undefined {
  if (parent?.of) {
    for (const entry of parent.of) {
      if (entry.type === node._type) {
        return entry
      }
    }
  }
  return containers.get(node._type)
}
