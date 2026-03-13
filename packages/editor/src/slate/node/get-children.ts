import type {EditorSchema} from '../../editor/editor-schema'
import type {
  Descendant,
  Node,
  NodeChildrenOptions,
  NodeEntry,
} from '../interfaces/node'
import {getAncestor} from './get-ancestor'
import {getChild} from './get-child'

export function* getChildren(
  root: Node,
  path: Path,
  schema: EditorSchema,
  options: NodeChildrenOptions = {},
): Generator<NodeEntry<Descendant>, void, undefined> {
  const {reverse = false} = options
  const ancestor = getAncestor(root, path, schema)
  const {children} = ancestor
  let index = reverse ? children.length - 1 : 0

  while (reverse ? index >= 0 : index < children.length) {
    const child = getChild(ancestor, index, schema)
    const childPath = path.concat(index)
    yield [child, childPath]
    index = reverse ? index - 1 : index + 1
  }
}

type Path = number[]
