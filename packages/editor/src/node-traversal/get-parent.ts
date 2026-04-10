import type {EditorSchema} from '../editor/editor-schema'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'
import {getNode} from './get-node'

/**
 * Get the parent of a node at a given path.
 */
export function getParent(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
    value: Array<Node>
  },
  path: Path,
): {node: Node; path: Path} | undefined {
  if (path.length === 0) {
    return undefined
  }

  const parent = parentPath(path)

  if (parent.length === 0) {
    return undefined
  }

  return getNode(context, parent)
}
