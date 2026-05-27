import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isObjectNode} from '../engine/node/is-object-node'
import {isSpanNode} from '../engine/node/is-span-node'
import {getNode} from './get-node'
import {isInline} from './is-inline'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the node at the given path if it is inline (a span or inline object).
 *
 * A node is inline if its parent is a text block. Returns the node narrowed
 * to `PortableTextSpan | PortableTextObject`, or `undefined` if the node
 * doesn't exist or is not inline.
 */
export function getInline(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextSpan | PortableTextObject; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry || !isInline(snapshot, path)) {
    return undefined
  }

  if (
    !isSpanNode({schema: snapshot.context.schema}, entry.node) &&
    !isObjectNode({schema: snapshot.context.schema}, entry.node)
  ) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
