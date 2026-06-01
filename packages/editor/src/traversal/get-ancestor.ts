import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getAncestors} from './get-ancestors'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Find an ancestor of the node at a given path that matches a predicate.
 * Does not check the node at the path itself, only its ancestors.
 *
 * `mode: 'lowest'` (default) returns the nearest matching ancestor.
 * `mode: 'highest'` returns the outermost matching ancestor.
 *
 * When `match` is a type predicate, the returned `node` narrows to that type.
 *
 * @beta
 */
export function getAncestor<TMatch extends PortableTextBlock>(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match: (node: PortableTextBlock, path: Path) => node is TMatch
    mode?: 'lowest' | 'highest'
  },
): {node: TMatch; path: Path} | undefined
/**
 * @beta
 */
export function getAncestor(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match: (node: PortableTextBlock, path: Path) => boolean
    mode?: 'lowest' | 'highest'
  },
): {node: PortableTextBlock; path: Path} | undefined
export function getAncestor(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match: (node: PortableTextBlock, path: Path) => boolean
    mode?: 'lowest' | 'highest'
  },
): {node: PortableTextBlock; path: Path} | undefined {
  const {match, mode = 'lowest'} = options
  const ancestors = getAncestors(snapshot, path)

  if (mode === 'highest') {
    for (const ancestor of [...ancestors].reverse()) {
      if (match(ancestor.node, ancestor.path)) {
        return ancestor
      }
    }
    return undefined
  }

  for (const ancestor of ancestors) {
    if (match(ancestor.node, ancestor.path)) {
      return ancestor
    }
  }

  return undefined
}
