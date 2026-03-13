import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import {isLeaf} from './is-leaf'

export function getNodeIf(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Node | undefined {
  let node = root

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!

    if (isLeaf(node, schema)) {
      return
    }

    const children = (node as Ancestor).children

    if (!children[p]) {
      return
    }

    node = children[p]! as Node
  }

  return node
}

type Path = number[]
