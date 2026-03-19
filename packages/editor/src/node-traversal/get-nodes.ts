import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

export function* getNodes(
  root: {children: Array<Node>},
  path: Array<number>,
  schema: EditorSchema,
  options: {reverse?: boolean} = {},
): Generator<[Node, Array<number>], void, undefined> {
  const {reverse = false} = options
  const children = getChildren(root, path, schema)
  const indices = reverse
    ? Array.from({length: children.length}, (_, i) => children.length - 1 - i)
    : Array.from({length: children.length}, (_, i) => i)

  for (const index of indices) {
    const child = children[index]

    if (!child) {
      continue
    }

    const childPath = [...path, index]
    yield [child, childPath]
    yield* getNodes(root, childPath, schema, options)
  }
}
