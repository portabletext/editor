import {node as editorNode} from '../editor/node'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'

export const matchPath = (
  editor: Editor,
  path: Path,
): ((node: Node) => boolean) => {
  const [matchedNode] = editorNode(editor, path)
  return (n) => n === matchedNode
}
