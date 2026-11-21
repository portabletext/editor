import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/container-types'
import {everyAncestors} from './every-field'
import type {TraversalSnapshot} from './traversal-snapshot'
import {ancestorNodes, walkPath} from './walk-path'

/**
 * Get all ancestors of the node at a given path, from nearest to furthest.
 *
 * For a path like `[{_key:'t1'}, 'rows', {_key:'r1'}, 'cells', {_key:'c1'}]`,
 * the ancestors are (nearest first):
 *
 * ```ts
 * [{_key:'t1'}, 'rows', {_key:'r1'}]
 * [{_key:'t1'}]
 * ```
 *
 * The ancestors of a missing target are the nodes walked before it.
 *
 * Without a registry, plain object fields and spans with object fields
 * can also be ancestors.
 *
 * @public
 */
export function getAncestors(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
  path: Path,
): Array<{node: PortableTextBlock; path: Path}>
/** @public */
export function getAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}>
export function getAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  if (snapshot.context.containers === undefined) {
    return everyAncestors(snapshot, path)
  }
  const ancestors = ancestorNodes(walkPath(snapshot, path), path)

  if (!ancestors || ancestors.some((node) => node.children === undefined)) {
    return []
  }

  return ancestors.map((node) => ({node: node.node, path: node.path})).reverse()
}
