import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Node, ObjectNode} from '../interfaces/node'
import type {Text} from '../interfaces/text'
import {isText} from '../text/is-text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getLeaf(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Text | ObjectNode {
  const node = getNode(root, path, schema)

  if (!isText(node, schema) && !isObjectNode(node, schema)) {
    throw new Error(
      `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${safeStringify(
        node,
      )}`,
    )
  }

  return node
}

type Path = number[]
