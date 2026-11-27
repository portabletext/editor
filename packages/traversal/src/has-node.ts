import type {Path} from '@portabletext/patches'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Check if a node exists at a given path.
 *
 * @public
 */
export function hasNode(snapshot: TraversalSnapshot, path: Path): boolean {
  return getNode(snapshot, path) !== undefined
}
