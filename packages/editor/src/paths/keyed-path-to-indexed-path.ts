import type {Node} from '../slate/interfaces/node'
import type {KeyedSegment} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Converts a keyed path to an indexed path by recursively walking the tree
 * assuming each string segment is the address of the current node's children.
 *
 * - `[{_key: 'k0'}]` -> `[0]`
 * - `[{_key: 'k0'}, 'children', {_key: 's0'}]` -> `[0, 0]`
 * - `[{_key: 'k0'}, 'children', {_key: 's0'}, 'children', {_key: 's1'}]` -> `[0, 0, 0]`
 */
export function keyedPathToIndexedPath(
  node: {
    children: Array<Node>
  },
  keyedPath: Array<KeyedSegment | string>,
): Array<number> {
  const indexedPath: Array<number> = []
  let currentNode: Node | undefined

  for (let i = 0; i < keyedPath.length; i++) {
    const segment = keyedPath[i]

    if (!segment) {
      break
    }

    if (isKeyedSegment(segment)) {
      let currentChildIndex = 0

      for (const child of node.children) {
        if (child._key === segment._key) {
          currentNode = child

          indexedPath.push(currentChildIndex)

          break
        }

        currentChildIndex++
      }
    } else {
      if (currentNode && segment in currentNode) {
        // Dynamic property access for schema-defined child fields (e.g. "children").
        // The `in` check above ensures the property exists on the node.
        const childrenField = (currentNode as Record<string, unknown>)[segment]

        if (Array.isArray(childrenField)) {
          const subPath = keyedPathToIndexedPath(
            {children: childrenField as Array<Node>},
            keyedPath.slice(i + 1),
          )

          indexedPath.push(...subPath)
        }
      }

      break
    }
  }

  return indexedPath
}
