import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

export function getParent(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): Node | undefined {
  if (path.length <= 1) {
    return undefined
  }

  return getNode(root, path.slice(0, -1), schema)
}
