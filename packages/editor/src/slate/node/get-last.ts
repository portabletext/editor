import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNode} from './get-node'
import {isLeaf} from './is-leaf'

export function getLast(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): NodeEntry {
  const p = path.slice()
  let n: Node

  if (path.length === 0) {
    if (isLeaf(root, schema) || root.children.length === 0) {
      throw new Error('Cannot get the last descendant of a leaf or empty root')
    }

    const i = root.children.length - 1
    n = root.children[i]!
    p.push(i)
  } else {
    n = getNode(root, p, schema)
  }

  while (n) {
    if (isLeaf(n, schema)) {
      break
    }

    const ancestorChildren = n.children

    if (ancestorChildren.length === 0) {
      break
    }

    const i = ancestorChildren.length - 1
    n = ancestorChildren[i]!
    p.push(i)
  }

  return [n, p]
}
