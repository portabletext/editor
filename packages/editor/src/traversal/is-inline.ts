import type {Path} from '../engine/interfaces/path'
import {isCompactPath} from '../engine/path/is-compact-path'
import {isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Determine if a node at the given path is inline.
 *
 * A node is inline if its parent is a text block. This is the inverse of
 * `isBlock`. Top-level nodes are never inline.
 *
 * @public
 */
export function isInline(snapshot: TraversalSnapshot, path: Path): boolean {
  if (isCompactPath(path)) {
    return false
  }

  return !isBlock(snapshot, path)
}
