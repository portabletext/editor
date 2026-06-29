import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import type {RegisteredContainer} from '../schema/resolve-containers'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the node at a given path.
 *
 * The path can be either keyed (KeyedSegment + field name strings) or
 * indexed (numbers). Keyed segments are resolved by matching `_key`,
 * field name strings name a structural descent into the previous
 * node's children, and numbers are resolved by index.
 *
 * The returned `path` always identifies the returned node: it's fully
 * keyed (numeric indices are converted to `KeyedSegment`s) and any
 * trailing segments in the input that point outside the value tree —
 * e.g. an object node's primitive field, or an annotation reached via
 * `'markDefs'` on a text block — are stripped so that
 * `getNode(snapshot, entry.path).node === entry.node`.
 *
 * The walk stops when a string segment names a field that isn't the
 * current node's structural child array. Annotations live in
 * `markDefs` on a text block, alongside `children` rather than inside
 * it, so `getNode` resolves an annotation path to the enclosing text
 * block. Use `getAnnotation` to resolve the annotation itself.
 *
 * @beta
 */
export function getNode(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  if (path.length === 0) {
    return undefined
  }

  const {context, blockIndexMap} = snapshot
  let currentChildren: Array<Node> = context.value
  let currentFieldName: string | undefined
  let node: Node | undefined
  let currentParent: RegisteredContainer | undefined
  const resolvedPath: Path = []

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (typeof segment === 'string') {
      // A string segment names a structural descent. If it matches the
      // field name produced by the previous node's `getNodeChildren`,
      // it's part of the value-tree descent — push it and continue.
      // Otherwise it's a sidecar (markDefs on a text block, a primitive
      // field on an object) and the rest of the path is suffix.
      if (currentFieldName !== undefined && segment === currentFieldName) {
        resolvedPath.push(segment)
        continue
      }
      break
    }

    if (isKeyedSegment(segment)) {
      resolvedPath.push(segment)
      const index = blockIndexMap.get(serializePath(resolvedPath))
      if (
        index !== undefined &&
        currentChildren[index]?._key === segment._key
      ) {
        node = currentChildren[index]
      } else {
        // The map can miss (unkeyed transient nodes, e.g. `{_type:'table'}`
        // inserted by a remote patch before normalize mints a key) or
        // disagree with the traversed value (snapshots that pair the live
        // map with a pre-apply value, e.g. `textPatch`). Fall back to a
        // linear scan in both cases.
        node = currentChildren.find((child) => child._key === segment._key)
        if (node && node._key !== undefined) {
          resolvedPath[resolvedPath.length - 1] = {_key: node._key}
        }
      }
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
      if (node) {
        resolvedPath.push({_key: node._key})
      }
    } else {
      return undefined
    }

    if (!node) {
      return undefined
    }

    let hasMoreSegments = false
    for (let j = i + 1; j < path.length; j++) {
      const s = path[j]
      if (isKeyedSegment(s) || typeof s === 'number') {
        hasMoreSegments = true
        break
      }
    }

    if (hasMoreSegments) {
      const next = getNodeChildren(context, node, currentParent)

      if (!next) {
        return undefined
      }

      currentChildren = next.children
      currentFieldName = next.fieldName
      currentParent = next.parent
    } else {
      currentFieldName = undefined
    }
  }

  if (!node) {
    return undefined
  }

  // Strip trailing field-name segments. The walker may have pushed
  // matching field names during structural descent; if the deepest
  // reached keyed segment was the last keyed segment in the input,
  // any further field names that followed are part of the input but
  // don't identify the returned node.
  while (
    resolvedPath.length > 0 &&
    typeof resolvedPath[resolvedPath.length - 1] === 'string'
  ) {
    resolvedPath.pop()
  }

  return {node, path: resolvedPath}
}
