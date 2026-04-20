import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {TraversalContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getNode} from './get-node'

/**
 * Get the text block node at a given path.
 */
export function getTextBlockNode(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
