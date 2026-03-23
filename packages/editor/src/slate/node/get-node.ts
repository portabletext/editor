import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNodeIf} from './get-node-if'

export function getNode(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
): Node {
  const node = getNodeIf(root, path, schema)

  if (node === undefined) {
    throw new Error(
      `Cannot find a descendant at path [${path}] in node: ${safeStringify(
        root,
      )}`,
    )
  }

  return node
}
