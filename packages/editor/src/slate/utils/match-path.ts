import {getNode} from '../../node-traversal/get-node'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'

export const matchPath = (
  editor: Editor,
  path: Path,
): ((node: Node) => boolean) => {
  const matchedEntry = getNode(editor, path)
  if (!matchedEntry) {
    return () => false
  }
  const matchedNode = matchedEntry.node
  return (n) => n === matchedNode
}
