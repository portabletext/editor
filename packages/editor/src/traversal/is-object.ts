import type {PortableTextObject} from '@portabletext/schema'
import {isTypedObject} from '../utils/asserters'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Check if a node is an object node (not a text block or span).
 *
 * @beta
 */
export function isObject(
  snapshot: TraversalSnapshot,
  node: unknown,
): node is PortableTextObject {
  return (
    isTypedObject(node) &&
    node._type !== snapshot.context.schema.block.name &&
    node._type !== snapshot.context.schema.span.name
  )
}
