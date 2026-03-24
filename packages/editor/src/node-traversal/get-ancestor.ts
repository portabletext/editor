import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getAncestors} from './get-ancestors'

/**
 * Find the first ancestor of the node at a given path that matches a predicate.
 * Does not check the node at the path itself, only its ancestors.
 */
export function getAncestor(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
  match: (node: Node, path: Array<number>) => boolean,
): {node: Node; path: Array<number>} | undefined {
  const ancestors = getAncestors(context, path)

  for (const ancestor of ancestors) {
    if (match(ancestor.node, ancestor.path)) {
      return ancestor
    }
  }

  return undefined
}
