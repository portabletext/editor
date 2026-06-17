import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
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

    const next = getNodeChildren(snapshot.context, node, currentParent)

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
 * Resolve a node's editable child array.
 *
 * When `parent` is provided and its `of` declares a positional entry
 * matching `node._type`, that positional entry's `field` is used.
 * Otherwise the top-level `containers.get(node._type)` provides the
 * fallback.
 *
 * The returned `parent` is the resolved container entry for `node`
 * itself (used by the caller to thread further descent).
 */
export function getNodeChildren(
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
    const resolved = resolveNodeContainer(context.containers, parent, node)

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
