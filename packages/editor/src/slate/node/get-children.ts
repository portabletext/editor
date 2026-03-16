import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getChild} from './get-child'
import {getNode} from './get-node'

export function* getChildren(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  options: {reverse?: boolean} = {},
): Generator<NodeEntry<Node>, void, undefined> {
  const {reverse = false} = options
  const ancestor = path.length === 0 ? root : getNode(root, path, schema)

  if (!isTextBlock({schema}, ancestor)) {
    return
  }

  const children = ancestor.children
  let index = reverse ? children.length - 1 : 0

  while (reverse ? index >= 0 : index < children.length) {
    const child = getChild(ancestor, index, schema)
    const childPath = path.concat(index)
    yield [child, childPath]
    index = reverse ? index - 1 : index + 1
  }
}
