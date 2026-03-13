import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {parentPath} from '../path/parent-path'
import {isText} from '../text/is-text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getParent(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Ancestor {
  const parentPath_ = parentPath(path)
  const p = getNode(root, parentPath_, schema)

  if (isText(p, schema) || isObjectNode(p, schema)) {
    throw new Error(
      `Cannot get the parent of path [${path}] because it does not exist in the root.`,
    )
  }

  return p
}
