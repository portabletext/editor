import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

/**
 * Check if a node exists at a given path.
 */
export function hasNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): boolean {
  return getNode(context, path) !== undefined
}
