import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isLeaf} from './is-leaf'

export function hasNode(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): boolean {
  let node: Editor | Node = root

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!

    if (isLeaf(node, schema)) {
      return false
    }

    const children = node.children

    if (!children[p]) {
      return false
    }

    node = children[p]!
  }

  return true
}
