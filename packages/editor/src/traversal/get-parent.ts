import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkParent} from './walk-path'

/**
 * Get the parent of a node at a given path.
 *
 * A parent has children, so it is always a `PortableTextBlock` (text block
 * or object node).
 *
 * When `match` is provided and the parent does not satisfy it, returns
 * `undefined`.
 *
 * @public
 */
export function getParent<TMatch extends PortableTextBlock>(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {
    match: (node: PortableTextBlock, path: Path) => node is TMatch
  },
): {node: TMatch; path: Path} | undefined
/**
 * @public
 */
export function getParent(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?: (node: PortableTextBlock, path: Path) => boolean
  },
): {node: PortableTextBlock; path: Path} | undefined
export function getParent(
  snapshot: TraversalSnapshot,
  path: Path,
  options?: {
    match?: (node: PortableTextBlock, path: Path) => boolean
  },
): {node: PortableTextBlock; path: Path} | undefined {
  const entry = walkParent(snapshot, path)

  if (!entry) {
    return undefined
  }

  const result = {node: entry.node as PortableTextBlock, path: entry.path}

  if (options?.match && !options.match(result.node, result.path)) {
    return undefined
  }

  return result
}
