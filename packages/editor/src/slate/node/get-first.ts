import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node, NodeEntry} from '../interfaces/node'
import {getNode} from './get-node'
import {isLeaf} from './is-leaf'

export function getFirst(
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

    n = ancestor.children[0]! as Node
    p.push(0)
  }

  return [n, p]
}

type Path = number[]
