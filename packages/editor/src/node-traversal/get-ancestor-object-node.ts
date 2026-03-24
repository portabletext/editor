import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import {getAncestor} from './get-ancestor'

export function getAncestorObjectNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: PortableTextObject; path: Array<number>} | undefined {
  const result = getAncestor(context, path, (node) =>
    isObjectNode({schema: context.schema}, node),
  )
  if (!result) {
    return undefined
  }
  if (!isObjectNode({schema: context.schema}, result.node)) {
    return undefined
  }
  return {node: result.node, path: result.path}
}
