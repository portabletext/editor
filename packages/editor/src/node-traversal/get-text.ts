import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getNode} from './get-node'
import {getNodes} from './get-nodes'

/**
 * Get the concatenated text content of the node at a given path.
 */
export function getText(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
    blockIndexMap: Map<string, number>
  },
  path: Path,
): string | undefined {
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (isSpan({schema: context.schema}, entry.node)) {
    return entry.node.text
  }

  let text = ''

  for (const descendant of getNodes(context, {at: path})) {
    if (isSpan({schema: context.schema}, descendant.node)) {
      text += descendant.node.text
    }
  }

  return text
}
