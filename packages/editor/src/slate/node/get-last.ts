import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node, NodeEntry} from '../interfaces/node'
import {getNode} from './get-node'
import {isLeaf} from './is-leaf'

export function getLast(
  root: Node,
  path: Path,
  schema: EditorSchema,
): NodeEntry {
  const p = path.slice()
  let n = getNode(root, p, schema)

  while (n) {
    if (isLeaf(n, schema)) {
      break
    }

    const ancestor = n as Ancestor

    if (ancestor.children.length === 0) {
      break
    }

    const i = ancestor.children.length - 1
    n = ancestor.children[i]! as Node
    p.push(i)
  }

  return [n, p]
}

type Path = number[]
