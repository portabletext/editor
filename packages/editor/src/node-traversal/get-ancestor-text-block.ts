import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getAncestor} from './get-ancestor'

export function getAncestorTextBlock(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: PortableTextTextBlock; path: Array<number>} | undefined {
  const result = getAncestor(context, path, (node) =>
    isTextBlock({schema: context.schema}, node),
  )
  if (!result) {
    return undefined
  }
  if (!isTextBlock({schema: context.schema}, result.node)) {
    return undefined
  }
  return {node: result.node, path: result.path}
}
