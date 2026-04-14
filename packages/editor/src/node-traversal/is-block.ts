import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isSpanNode} from '../slate/node/is-span-node'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {getNode} from './get-node'
import {getParent} from './get-parent'

/**
 * Determine if a node at the given path is a block.
 *
 * A node is a block if its parent is not a text block. Top-level nodes
 * (direct children of the editor) are always blocks. Children of text blocks
 * (spans and inline objects) are not blocks. Children of containers are
 * blocks within that container.
 */
export function isBlock(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): boolean {
  const parent = getParent(context, path)

  if (!parent) {
    return true
  }

  return !isTextBlockNode({schema: context.schema}, parent.node)
}

/**
 * Get the node at the given path if it is a block.
 *
 * Returns the node narrowed to PortableTextBlock, or undefined if the node
 * doesn't exist or is not a block.
 */
export function getBlock(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isBlock(context, path)) {
    return undefined
  }

  // Narrow the type: a block is never a span (spans always have a text block
  // parent, so isBlock returns false for them).
  if (isSpanNode({schema: context.schema}, entry.node)) {
    return undefined
  }

  // Node minus PortableTextSpan = PortableTextTextBlock | PortableTextObject = PortableTextBlock
  return {node: entry.node, path: entry.path}
}
