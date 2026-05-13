import type {PortableTextObject} from '@portabletext/schema'
import type {TraversalSnapshot} from '../../node-traversal/traversal-snapshot'
import {isEditableContainer} from '../../schema/is-editable-container'
import type {Path} from '../interfaces/path'
import {isObjectNode} from './is-object-node'

/**
 * Check if a node is a void (non-editable) object node.
 * Returns true for block objects and inline objects that don't have
 * registered editable content (containers).
 */
export function isVoidNode(
  snapshot: TraversalSnapshot,
  node: unknown,
  _path: Path,
): node is PortableTextObject {
  return (
    isObjectNode({schema: snapshot.context.schema}, node) &&
    !isEditableContainer(snapshot, node)
  )
}
