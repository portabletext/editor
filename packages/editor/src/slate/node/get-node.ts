import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Node} from '../interfaces/node'
import {getNodeIf} from './get-node-if'

export function getNode(root: Node, path: Path, schema: EditorSchema): Node {
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

type Path = number[]
