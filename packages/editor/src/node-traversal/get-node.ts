import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
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
  const resolvedPath: Path = []
  let isRootLevel = true

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (typeof segment === 'string') {
      resolvedPath.push(segment)
      continue
    }

    if (isKeyedSegment(segment)) {
      if (isRootLevel && blockIndexMap.size === currentChildren.length) {
        const index = blockIndexMap.get(segment._key)
        if (index !== undefined) {
          const candidate = currentChildren[index]
          if (candidate && candidate._key === segment._key) {
            node = candidate
          } else {
            node = currentChildren.find((child) => child._key === segment._key)
          }
        } else {
          node = currentChildren.find((child) => child._key === segment._key)
        }
      } else {
        node = currentChildren.find((child) => child._key === segment._key)
      }
      resolvedPath.push(segment)
      isRootLevel = false
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
      const next = getNodeChildren(context, node)

      if (!next) {
        return undefined
      }

      currentChildren = next.children
    }
  }

  if (!node) {
    return undefined
  }

  return {node, path: resolvedPath}
}
