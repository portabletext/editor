import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
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
    editableTypes: Set<string>
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
 * Get the nearest block at or above the given path.
 *
 * Checks the node at the path first. If it is not a block, walks up
 * through ancestor paths until a block is found. Returns undefined if
 * no block is found.
 */
export function getBlock(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const entry = getBlockAtPath(context, path)

  if (entry) {
    return entry
  }

  for (let length = path.length - 1; length >= 1; length--) {
    const segment = path[length - 1]
    if (typeof segment === 'string') {
      continue
    }
    const ancestorPath = path.slice(0, length)
    const ancestorEntry = getBlockAtPath(context, ancestorPath)
    if (ancestorEntry) {
      return ancestorEntry
    }
  }

  return undefined
}

function getBlockAtPath(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
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

  if (isSpanNode({schema: context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
