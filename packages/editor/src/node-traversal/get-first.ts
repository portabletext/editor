import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

export function getFirst(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
): [Node, Array<number>] | undefined {
  const children = getChildren(root, path, schema)
  const first = children[0]

  if (!first) {
    return undefined
  }

  return [first, [...path, 0]]
}
