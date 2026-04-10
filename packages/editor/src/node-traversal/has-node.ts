import type {EditorSchema} from '../editor/editor-schema'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getNode} from './get-node'

/**
 * Check if a node exists at a given path.
 */
export function hasNode(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
    value: Array<Node>
    blockIndexMap?: Map<string, number>
  },
  path: Path,
): boolean {
  return getNode(context, path) !== undefined
}
