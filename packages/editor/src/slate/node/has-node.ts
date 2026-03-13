import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import {isLeaf} from './is-leaf'

export function hasNode(root: Node, path: Path, schema: EditorSchema): boolean {
  let node = root

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!

    if (isLeaf(node, schema)) {
      return false
    }

    const children = (node as Ancestor).children

    if (!children[p]) {
      return false
    }

    node = children[p]! as Node
  }

  return true
}

type Path = number[]
