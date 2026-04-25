import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {isSpanNode} from '../slate/node/is-span-node'
import {getNode} from './get-node'
import {isInline} from './is-inline'

/**
 * Get the node at the given path if it is inline (a span or inline object).
 *
 * A node is inline if its parent is a text block. Returns the node narrowed
 * to `PortableTextSpan | PortableTextObject`, or `undefined` if the node
 * doesn't exist or is not inline.
 */
export function getInline(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextSpan | PortableTextObject; path: Path} | undefined {
  const entry = getNode(context, path)

  if (!entry || !isInline(context, path)) {
    return undefined
  }

  if (
    !isSpanNode({schema: context.schema}, entry.node) &&
    !isObjectNode({schema: context.schema}, entry.node)
  ) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
