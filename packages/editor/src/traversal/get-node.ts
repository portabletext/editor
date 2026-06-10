import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getNodeChildren} from './get-children'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the node at a given path.
 *
 * The path can be either keyed (KeyedSegment + field name strings) or
 * indexed (numbers). Keyed segments are resolved by matching `_key`,
 * field name strings are skipped (they're structural), and numbers
 * are resolved by index.
 *
 * The returned path is always fully keyed, even if the input path
 * contained numeric indices.
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
  let node: Node | undefined
  let currentParent:
    | import('../schema/resolve-containers').RegisteredContainer
    | undefined
  const resolvedPath: Path = []

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (typeof segment === 'string') {
      resolvedPath.push(segment)
      continue
    }

    if (isKeyedSegment(segment)) {
      resolvedPath.push(segment)
      const index = blockIndexMap.get(serializePath(resolvedPath))
      if (index !== undefined) {
        node = currentChildren[index]
      } else {
        // Unkeyed transient nodes (e.g. `{_type:'table'}` inserted by remote
        // patch, before normalize mints a key) can't appear in the
        // path-keyed `blockIndexMap`. Fall back to a linear scan so
        // normalization can resolve them.
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
      currentParent = next.parent
    }
  }

  if (!node) {
    return undefined
  }

  return {node, path: resolvedPath}
}
