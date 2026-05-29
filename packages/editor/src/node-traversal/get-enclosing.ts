import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Walk up from a path to find the nearest enclosing node that matches a
 * predicate.
 *
 * Returns the node at the path if it matches, otherwise the first ancestor
 * that matches.
 *
 * When `match` is a type predicate, the returned `node` narrows to that type.
 *
 * @beta
 */
export function getEnclosing<TMatch extends Node>(
  snapshot: TraversalSnapshot,
  path: Path,
  match: (node: Node, path: Path) => node is TMatch,
): {node: TMatch; path: Path} | undefined
/**
 * @beta
 */
export function getEnclosing(
  snapshot: TraversalSnapshot,
  path: Path,
  match: (node: Node, path: Path) => boolean,
): {node: Node; path: Path} | undefined
export function getEnclosing(
  snapshot: TraversalSnapshot,
  path: Path,
  match: (node: Node, path: Path) => boolean,
): {node: Node; path: Path} | undefined {
  const direct = getNode(snapshot, path)

  if (direct && match(direct.node, direct.path)) {
    return direct
  }

  for (const ancestor of getAncestors(snapshot, path)) {
    if (match(ancestor.node, ancestor.path)) {
      return ancestor
    }
  }

  return undefined
}
