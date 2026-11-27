import type {Path} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'
import {ancestorNodes, walkPath} from './walk-path'

/**
 * Determine if a node at the given path is a block.
 *
 * A node is a block unless its parent is a text block at a block position. A text block inside another text block's `children` is an inline object, so its own children are blocks.
 *
 * @public
 */
export function isBlock(snapshot: TraversalSnapshot, path: Path): boolean {
  const walk = walkPath(snapshot, path)

  if (walk.status === 'invalid') {
    return false
  }

  const parent = ancestorNodes(walk, path)?.at(-1)

  if (!parent) {
    return true
  }

  return parent.kind !== 'text block'
}

/**
 * Get the node at the given path if it is at a block position, typed as `PortableTextBlock`.
 * Returns `undefined` if there is no such node or it is inline.
 * A span at a block position is returned as an object and keeps its span fields.
 *
 * @public
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

  return {node: entry.node as PortableTextBlock, path: entry.path}
}
