import type {Path} from '../engine/interfaces/path'
import {isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkedNode, walkPath} from './walk-path'

/**
 * Determine if a node at the given path is inline. This is the inverse of
 * `isBlock`: a node is inline when its parent is a text block at a block position.
 * A text block inside another text block's `children` is inline itself, and its own children are not.
 *
 * @public
 */
export function isInline(snapshot: TraversalSnapshot, path: Path): boolean {
  if (!walkedNode(walkPath(snapshot, path))) {
    return false
  }

  return !isBlock(snapshot, path)
}
