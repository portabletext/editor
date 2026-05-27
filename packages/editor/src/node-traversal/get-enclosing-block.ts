import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {getAncestors} from './get-ancestors'
import {getBlock, isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Walk up from a path to find the nearest enclosing block.
 *
 * Returns the node at the path if it is a block, otherwise the first ancestor
 * that is a block. Works at any depth — inside a container this returns the
 * container-internal block, not the outer container.
 *
 * @beta
 */
export function getEnclosingBlock(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const direct = getBlock(snapshot, path)

  if (direct) {
    return direct
  }

  for (const ancestor of getAncestors(snapshot, path)) {
    if (isBlock(snapshot, ancestor.path)) {
      const block = getBlock(snapshot, ancestor.path)

      if (block) {
        return block
      }
    }
  }

  return undefined
}
