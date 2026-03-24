import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

/**
 * Get all ancestors of the node at a given path, from nearest to furthest.
 */
export function getAncestors(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): Array<{node: Node; path: Array<number>}> {
  if (path.length <= 1) {
    return []
  }

  const ancestors: Array<{node: Node; path: Array<number>}> = []

  for (let length = path.length - 1; length >= 1; length--) {
    const ancestorPath = path.slice(0, length)
    const entry = getNode(context, ancestorPath)

    if (entry) {
      ancestors.push(entry)
    }
  }

  return ancestors
}
