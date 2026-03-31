import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

/**
 * Get the last child of a node at a given path.
 */
export function getLastChild(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: Node; path: Array<number>} | undefined {
  const children = getChildren(context, path)

  return children.at(-1)
}
