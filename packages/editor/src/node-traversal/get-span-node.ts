import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

/**
 * Get the span node at a given path.
 */
export function getSpanNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: PortableTextSpan; path: Array<number>} | undefined {
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isSpan({schema: context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
