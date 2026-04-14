import type {PortableTextTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getAncestor} from './get-ancestor'

export function getAncestorTextBlock(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
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
