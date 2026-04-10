import type {EditorSchema} from '../editor/editor-schema'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getChildren} from './get-children'

/**
 * Get the last child of a node at a given path.
 */
export function getLastChild(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
    value: Array<Node>
  },
  path: Path,
): {node: Node; path: Path} | undefined {
  const children = getChildren(context, path)

  return children.at(-1)
}
