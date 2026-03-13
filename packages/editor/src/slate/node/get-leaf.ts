import type {EditorSchema} from '../../editor/editor-schema'
import type {Node, ObjectNode} from '../interfaces/node'
import {Scrubber} from '../interfaces/scrubber'
import type {Text} from '../interfaces/text'
import {Text as TextUtils} from '../interfaces/text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getLeaf(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Text | ObjectNode {
  const node = getNode(root, path, schema)

  if (!TextUtils.isText(node, schema) && !isObjectNode(node, schema)) {
    throw new Error(
      `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${Scrubber.stringify(
        node,
      )}`,
    )
  }

  return node
}

type Path = number[]
