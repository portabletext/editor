import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getAncestors} from './get-ancestors'

/**
 * Find the first ancestor of the node at a given path that matches a predicate.
 * Does not check the node at the path itself, only its ancestors.
 *
 * When `match` is a type predicate, the returned `node` narrows to that type.
 */
export function getAncestor<TMatch extends Node>(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
  match: (node: Node, path: Path) => node is TMatch,
): {node: TMatch; path: Path} | undefined
export function getAncestor(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
  match: (node: Node, path: Path) => boolean,
): {node: Node; path: Path} | undefined
export function getAncestor(
  context: {
    schema: EditorSchema
    containers: Containers
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
