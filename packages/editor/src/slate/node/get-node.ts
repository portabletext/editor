import type {EditorSchema} from '../../editor/editor-schema'
import type {Node} from '../interfaces/node'
import {Scrubber} from '../interfaces/scrubber'
import {getNodeIf} from './get-node-if'

export function getNode(root: Node, path: Path, schema: EditorSchema): Node {
  const node = getNodeIf(root, path, schema)
  if (node === undefined) {
    throw new Error(
      `Cannot find a descendant at path [${path}] in node: ${Scrubber.stringify(
        root,
      )}`,
    )
  }
  return node
}

type Path = number[]
