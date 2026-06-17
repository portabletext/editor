import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {resolveContainerOf} from '../schema/resolve-container-of'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {isTypedObject} from '../utils/asserters'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the children of the node at a given path.
 *
 * Resolves positional registrations (containers registered only inside a
 * parent's `of`) as it descends. Returns `[]` when the path doesn't
 * resolve, when the target node has no editable children, or when an
 * ancestor's `_type` is not registered as a container.
 *
 * Path-based variant. When the caller already holds the node, prefer
 * {@link getChildrenOf} for an `O(1)` lookup that doesn't re-walk from
 * the root.
 *
 * @beta
 */
export function getChildrenAt(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  let currentChildren: Array<Node> = snapshot.context.value
  let currentFieldName = 'value'
  let currentPath: Path = []
  let isRoot = true
  let currentParent: RegisteredContainer | undefined

  for (const segment of path) {
    if (typeof segment === 'string') {
      continue
    }

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      // Resolve via `blockIndexMap` (O(1)) and fall back to a linear scan on a
      // miss or when the snapshot's map disagrees with the value, mirroring
      // `getNode`. The candidate path is this segment's full keyed path.
      const candidatePath: Path = isRoot
        ? [{_key: segment._key}]
        : [...currentPath, currentFieldName, {_key: segment._key}]
      const index = snapshot.blockIndexMap.get(serializePath(candidatePath))
      node =
        index !== undefined && currentChildren[index]?._key === segment._key
          ? currentChildren[index]
          : currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
    }

    if (!node) {
      return []
    }

    currentPath = isRoot
      ? [{_key: node._key}]
      : [...currentPath, currentFieldName, {_key: node._key}]
    isRoot = false

    const next = getChildrenOf(snapshot.context, node, currentParent)

    if (!next) {
      return []
    }

    currentChildren = next.children
    currentFieldName = next.fieldName
    currentParent = next.parent
  }

  return currentChildren.map((child) => ({
    node: child,
    path: isRoot
      ? [{_key: child._key}]
      : [...currentPath, currentFieldName, {_key: child._key}],
  }))
}

/**
 * Get the editable children of a held node, plus the field name they
 * live on and the resolved container registration for the node itself.
 *
 * Returns `undefined` when the node has no editable children at this
 * position (unregistered `_type`, leaf, or non-container shape).
 *
 * Node-based variant. The companion to {@link getChildrenAt} for
 * consumers iterating the value tree recursively; descend with the
 * returned `parent` to thread positional resolution down the next
 * level.
 *
 * @beta
 */
export function getChildrenOf(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  node: Node | {value: Array<Node>},
  parent?: RegisteredContainer,
):
  | {
      children: Array<Node>
      fieldName: string
      parent: RegisteredContainer | undefined
    }
  | undefined {
  // Text blocks store children in .children
  if (isTextBlock(context, node)) {
    return {
      children: node.children,
      fieldName: 'children',
      parent: undefined,
    }
  }

  if (
    isTypedObject(node) &&
    node._type !== context.schema.block.name &&
    node._type !== context.schema.span.name
  ) {
    const resolved = resolveContainerOf(context.containers, parent, node)

    if (!resolved) {
      return undefined
    }

    const fieldValue = (node as Record<string, unknown>)[resolved.field.name]

    if (!Array.isArray(fieldValue)) {
      return undefined
    }

    return {
      children: fieldValue as Array<Node>,
      fieldName: resolved.field.name,
      parent: resolved,
    }
  }

  // Root context: has .value array but no _key or _type
  if (
    'value' in node &&
    Array.isArray(node['value']) &&
    !('_key' in node) &&
    !('_type' in node)
  ) {
    return {
      children: node['value'] as Array<Node>,
      fieldName: 'value',
      parent: undefined,
    }
  }

  return undefined
}
