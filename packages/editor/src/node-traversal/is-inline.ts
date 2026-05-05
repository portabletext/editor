import type {Path} from '../slate/interfaces/path'
import {isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Determine if a node at the given path is inline.
 *
 * A node is inline if its parent is a text block. This is the inverse of
 * `isBlock`. Top-level nodes are never inline.
 */
export function isInline(snapshot: TraversalSnapshot, path: Path): boolean {
  return !isBlock(snapshot, path)
}
