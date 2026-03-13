import type {Path} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {hasNode} from '../node/has-node'

export function hasPath(editor: Editor, path: Path): boolean {
  return hasNode(editor, path, editor.schema)
}
