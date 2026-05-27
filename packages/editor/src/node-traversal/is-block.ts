import type {PortableTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isSpanNode} from '../engine/node/is-span-node'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {getNode} from './get-node'
import {getParent} from './get-parent'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Determine if a node at the given path is a block.
 *
 * A node is a block if its parent is not a text block. Top-level nodes
 * (direct children of the editor) are always blocks. Children of text blocks
 * (spans and inline objects) are not blocks. Children of containers are
 * blocks within that container.
 *
 * @beta
 */
export function isBlock(snapshot: TraversalSnapshot, path: Path): boolean {
  const parent = getParent(snapshot, path)

  if (!parent) {
    return true
  }

  return !isTextBlockNode({schema: snapshot.context.schema}, parent.node)
}

/**
 * Get the node at the given path if it is a block.
 *
 * Returns the node narrowed to PortableTextBlock, or undefined if the node
 * doesn't exist or is not a block.
 *
 * @beta
 */
export function getBlock(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (!isBlock(snapshot, path)) {
    return undefined
  }

  // Narrow the type: a block is never a span (spans always have a text block
  // parent, so isBlock returns false for them).
  if (isSpanNode({schema: snapshot.context.schema}, entry.node)) {
    return undefined
  }

  // Node minus PortableTextSpan = PortableTextTextBlock | PortableTextObject = PortableTextBlock
  return {node: entry.node, path: entry.path}
}
