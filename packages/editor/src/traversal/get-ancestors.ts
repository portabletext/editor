import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
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
 * Every ancestor is a `PortableTextBlock`: only text blocks and object
 * nodes can contain children.
 *
 * @public
 */
export function getAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: PortableTextBlock; path: Path}> {
  const ancestors = ancestorNodes(walkPath(snapshot, path), path)

  if (!ancestors || ancestors.some((node) => node.children === undefined)) {
    return []
  }

  // An ancestor has children, so it is never a span. The narrowing from
  // `Node` to `PortableTextBlock` (text block | object) is safe.
  return ancestors
    .map((node) => ({node: node.node as PortableTextBlock, path: node.path}))
    .reverse()
}
