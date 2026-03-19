import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

export function hasNode(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): boolean {
  return getNode(root, path, schema) !== undefined
}
