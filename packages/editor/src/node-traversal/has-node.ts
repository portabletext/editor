import type {Path} from '../slate/interfaces/path'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Check if a node exists at a given path.
 *
 * @beta
 */
export function hasNode(snapshot: TraversalSnapshot, path: Path): boolean {
  return getNode(snapshot, path) !== undefined
}
