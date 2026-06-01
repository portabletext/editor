import type {PortableTextObject} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isEditableContainer} from '../schema/is-editable-container'
import {isObject} from './is-object'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Check if a node is a leaf object: an object node that has no editable
 * children (not a container).
 * Returns true for block objects and inline objects that don't have
 * registered editable content (containers).
 *
 * @beta
 */
export function isLeafObject(
  snapshot: TraversalSnapshot,
  node: unknown,
  path: Path,
): node is PortableTextObject {
  return isObject(snapshot, node) && !isEditableContainer(snapshot, node, path)
}
