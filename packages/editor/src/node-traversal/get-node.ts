import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

export function getNode(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): Node | undefined {
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]

  if (index === undefined) {
    return undefined
  }

  return getChildren(root, parentPath, schema)[index]
}
