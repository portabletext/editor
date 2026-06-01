import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Walk up from a path to find the nearest enclosing block.
 *
 * Returns the node at the path if it is a block, otherwise the first ancestor
 * that is a block. Works at any depth — inside a container this returns the
 * container-internal block, not the outer container.
 *
 * With `match`, returns the first enclosing block that also satisfies the
 * predicate. When `match` is a type predicate, the returned `node` narrows
 * to that type.
 *
 * `mode: 'lowest'` (default) returns the innermost enclosing block; the node
 * at the path itself counts. `mode: 'highest'` returns the outermost
 * ancestor that matches, falling back to the node at the path only if no
 * ancestor does.
 *
 * @beta
 */
export function getEnclosingBlock<TMatch extends PortableTextBlock>(
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
export function getEnclosingBlock(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?: (node: PortableTextBlock, path: Path) => boolean
    mode?: 'lowest' | 'highest'
  },
): {node: PortableTextBlock; path: Path} | undefined
export function getEnclosingBlock(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?: (node: PortableTextBlock, path: Path) => boolean
    mode?: 'lowest' | 'highest'
  },
): {node: PortableTextBlock; path: Path} | undefined {
  const match = options?.match
  const mode = options?.mode ?? 'lowest'

  if (mode === 'highest') {
    const ancestors = getAncestors(snapshot, path)

    for (const ancestor of [...ancestors].reverse()) {
      if (!match || match(ancestor.node, ancestor.path)) {
        return ancestor
      }
    }

    const direct = getBlock(snapshot, path)

    if (direct && (!match || match(direct.node, direct.path))) {
      return direct
    }

    return undefined
  }

  const direct = getBlock(snapshot, path)

  if (direct && (!match || match(direct.node, direct.path))) {
    return direct
  }

  for (const ancestor of getAncestors(snapshot, path)) {
    if (!match || match(ancestor.node, ancestor.path)) {
      return ancestor
    }
  }

  return undefined
}
