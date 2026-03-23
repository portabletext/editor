import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isLeaf} from './is-leaf'

export function getNodeIf(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): Node | undefined {
  if (path.length === 0) {
    return undefined
  }

  let node: Editor | Node = root

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!

    if (isLeaf(node, schema)) {
      return
    }

    const children = node.children

    if (!children[p]) {
      return
    }

    node = children[p]!
  }

  return node as Node
}
