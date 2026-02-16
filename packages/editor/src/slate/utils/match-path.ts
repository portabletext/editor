import {Editor} from '../interfaces/editor'
import {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'

export const matchPath = (
  editor: Editor,
  path: Path,
): ((node: Node) => boolean) => {
  const [node] = Editor.node(editor, path)
  return (n) => n === node
}
