import type {Node} from '../slate/interfaces/node'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Converts a keyed path to an indexed path.
 *
 * Uses `blockIndexMap` for O(1) lookup of the first segment, then walks the
 * tree for deeper segments using string segments as property names.
 *
 * - `[{_key: 'k0'}]` -> `[0]`
 * - `[{_key: 'k0'}, 'children', {_key: 's0'}]` -> `[0, 0]`
 */
export function keyedPathToIndexedPath(
  root: {children: Array<Node>},
  keyedPath: Path,
  blockIndexMap: Map<string, number>,
): Array<number> {
  if (keyedPath.length === 0) {
    return []
  }

  const firstSegment = keyedPath[0]

  if (!firstSegment || !isKeyedSegment(firstSegment)) {
    return []
  }

  const blockIndex = blockIndexMap.get(firstSegment._key)

  if (blockIndex === undefined) {
    return []
  }

  const block = root.children[blockIndex]

  if (!block) {
    return []
  }

  return [blockIndex, ...resolveChildPath(block, keyedPath.slice(1))]
}

function resolveChildPath(node: Node, keyedPath: Path): Array<number> {
  for (let i = 0; i < keyedPath.length; i++) {
    const segment = keyedPath[i]

    if (!segment) {
      break
    }

    if (isKeyedSegment(segment)) {
      const children = (node as {children?: Array<Node>}).children

      if (!children) {
        break
      }

      let childIndex = 0

      for (const child of children) {
        if (child._key === segment._key) {
          return [
            childIndex,
            ...resolveChildPath(child, keyedPath.slice(i + 1)),
          ]
        }

        childIndex++
      }

      break
    } else {
      if (typeof segment !== 'string') {
        break
      }

      if (!(segment in node)) {
        break
      }

      const childrenField = (node as Record<string, unknown>)[segment]

      if (Array.isArray(childrenField)) {
        return resolveChildPath(
          {children: childrenField} as unknown as Node,
          keyedPath.slice(i + 1),
        )
      }

      break
    }
  }

  return []
}
