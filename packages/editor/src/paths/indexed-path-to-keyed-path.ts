import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import type {KeyedSegment} from '../types/paths'

/**
 * Converts an indexed path to a keyed path by recursively walking the tree.
 *
 * Currently only supports text blocks by automatically assuming that child
 * nodes are stored in the `children` field.
 */
export function indexedPathToKeyedPath(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): Array<KeyedSegment | string> | null {
  if (path.length === 0) {
    return null
  }

  const result: Array<KeyedSegment | string> = []
  let currentChildren: Array<Node> = root.children

  for (let i = 0; i < path.length; i++) {
    const index = path[i]

    if (index === undefined) {
      return null
    }

    const node = currentChildren[index]

    if (!node || !node._key) {
      return null
    }

    result.push({_key: node._key})

    if (i < path.length - 1) {
      if (isTextBlock({schema}, node)) {
        result.push('children')
        currentChildren = node.children
      } else {
        return null
      }
    }
  }

  return result
}
