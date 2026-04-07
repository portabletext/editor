import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'

/**
 * Compare two paths in document order.
 *
 * When paths contain keyed segments, the root node tree is needed to
 * resolve document order. Without a root, keyed segments are compared
 * by _key string (consistent but not necessarily document order).
 */
export function comparePaths(
  path: Path,
  another: Path,
  root?: {children: Array<Node>},
): -1 | 0 | 1 {
  const min = Math.min(path.length, another.length)
  let currentChildren: Array<Node> | undefined = root?.children
  let currentNode: Node | undefined

  for (let i = 0; i < min; i++) {
    const segment = path[i]!
    const otherSegment = another[i]!

    if (isKeyedSegment(segment) && isKeyedSegment(otherSegment)) {
      if (segment._key === otherSegment._key) {
        if (currentChildren) {
          currentNode = currentChildren.find((c) => c._key === segment._key)
          currentChildren = undefined
        }
        continue
      }

      if (currentChildren) {
        const segmentIndex = currentChildren.findIndex(
          (c) => c._key === segment._key,
        )
        const otherSegmentIndex = currentChildren.findIndex(
          (c) => c._key === otherSegment._key,
        )
        if (segmentIndex !== -1 && otherSegmentIndex !== -1) {
          return segmentIndex < otherSegmentIndex ? -1 : 1
        }
      }

      // Fallback: compare by _key string
      if (segment._key < otherSegment._key) {
        return -1
      }
      if (segment._key > otherSegment._key) {
        return 1
      }
      continue
    }

    if (typeof segment === 'string' && typeof otherSegment === 'string') {
      if (segment === otherSegment) {
        if (currentNode) {
          const fieldValue = (currentNode as Record<string, unknown>)[segment]
          currentChildren = Array.isArray(fieldValue)
            ? (fieldValue as Array<Node>)
            : undefined
          currentNode = undefined
        }
        continue
      }
      if (segment < otherSegment) {
        return -1
      }
      if (segment > otherSegment) {
        return 1
      }
      continue
    }

    if (typeof segment === 'number' && typeof otherSegment === 'number') {
      if (segment < otherSegment) {
        return -1
      }
      if (segment > otherSegment) {
        return 1
      }
      continue
    }

    break
  }

  return 0
}
