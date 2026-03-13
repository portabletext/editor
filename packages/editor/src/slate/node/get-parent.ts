import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Text} from '../interfaces/text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getParent(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Ancestor {
  const parentPath = Path.parent(path)
  const p = getNode(root, parentPath, schema)

  if (Text.isText(p, schema) || isObjectNode(p, schema)) {
    throw new Error(
      `Cannot get the parent of path [${path}] because it does not exist in the root.`,
    )
  }

  return p
}
