import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNode} from './get-node'

/**
 * Get the text block node at a given path.
 */
export function getTextBlockNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: PortableTextTextBlock; path: Array<number>} | undefined {
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
