import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNode} from './get-node'
import {isLeaf} from './is-leaf'

export function getFirst(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): NodeEntry {
  const p = path.slice()
  let n: Node

  if (path.length === 0) {
    if (isLeaf(root, schema) || root.children.length === 0) {
      throw new Error('Cannot get the first descendant of a leaf or empty root')
    }

    n = root.children[0]!
    p.push(0)
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

    n = ancestorChildren[0]!
    p.push(0)
  }

  return [n, p]
}
