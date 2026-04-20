import type {EditorSchema} from '../editor/editor-schema'
import type {TraversalContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getAncestors} from './get-ancestors'

/**
 * Find the first ancestor of the node at a given path that matches a predicate.
 * Does not check the node at the path itself, only its ancestors.
 */
export function getAncestor(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
  match: (node: Node, path: Path) => boolean,
): {node: Node; path: Path} | undefined {
  const ancestors = getAncestors(context, path)

  for (const ancestor of ancestors) {
    if (match(ancestor.node, ancestor.path)) {
      return ancestor
    }
  }

  return undefined
}
