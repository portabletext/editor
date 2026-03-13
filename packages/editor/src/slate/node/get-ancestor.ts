import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Ancestor, Node} from '../interfaces/node'
import {isText} from '../text/is-text'
import {getNode} from './get-node'
import {isObjectNode} from './is-object-node'

export function getAncestor(
  root: Node,
  path: Path,
  schema: EditorSchema,
): Ancestor {
  const node = getNode(root, path, schema)

  if (isText(node, schema) || isObjectNode(node, schema)) {
    throw new Error(
      `Cannot get the ancestor node at path [${path}] because it refers to a leaf node instead: ${safeStringify(
        node,
      )}`,
    )
  }

  return node
}

type Path = number[]
