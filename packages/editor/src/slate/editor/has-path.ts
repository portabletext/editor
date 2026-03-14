import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {hasNode} from '../node/has-node'

export function hasPath(editor: Editor, path: Path): boolean {
  return hasNode(editor, path, editor.schema)
}
