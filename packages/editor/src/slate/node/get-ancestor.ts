import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import {Scrubber} from '../interfaces/scrubber'
import {Text} from '../interfaces/text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getAncestor(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Ancestor {
  const node = getNode(root, path, schema)

  if (Text.isText(node, schema) || isObjectNode(node, schema)) {
    throw new Error(
      `Cannot get the ancestor node at path [${path}] because it refers to a leaf node instead: ${Scrubber.stringify(
        node,
      )}`,
    )
  }

  return node
}

type Path = number[]
