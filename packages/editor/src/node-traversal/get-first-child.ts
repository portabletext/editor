import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

/**
 * Get the first child of a node at a given path.
 */
export function getFirstChild(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: Node; path: Array<number>} | undefined {
  return getChildren(context, path).at(0)
}
