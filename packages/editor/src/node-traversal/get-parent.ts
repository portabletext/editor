import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

/**
 * Get the parent of a node at a given path.
 */
export function getParent(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: Node; path: Array<number>} | undefined {
  if (path.length <= 1) {
    return undefined
  }

  return getNode(context, path.slice(0, -1))
}
