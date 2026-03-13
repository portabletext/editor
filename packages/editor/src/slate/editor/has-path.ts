import type {Path} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Node} from '../interfaces/node'

export function hasPath(editor: Editor, path: Path): boolean {
  return Node.has(editor, path, editor.schema)
}
