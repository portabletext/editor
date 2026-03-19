import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

export function getLast(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): [Node, Array<number>] | undefined {
  const children = getChildren(root, path, schema)
  const lastIndex = children.length - 1
  const last = children[lastIndex]

  if (!last) {
    return undefined
  }

  return [last, [...path, lastIndex]]
}
