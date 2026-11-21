import type {Path} from '../engine/interfaces/path'
import {everyPath} from './every-field'
import {isBlock} from './is-block'
import type {TraversalSnapshot} from './traversal-snapshot'
import {walkPath} from './walk-path'

/**
 * Determine if a node at the given path is inline. This is the inverse of
 * `isBlock`: a node is inline when its parent is a text block at a block position.
 * A text block inside another text block's `children` is inline itself, and its own children are not.
 *
 * @public
 */
export function isInline(snapshot: TraversalSnapshot, path: Path): boolean {
  if (snapshot.context.containers === undefined) {
    return !everyPath(snapshot, path).invalid && !isBlock(snapshot, path)
  }
  if (walkPath(snapshot, path).status === 'invalid') {
    return false
  }

  return !isBlock(snapshot, path)
}
