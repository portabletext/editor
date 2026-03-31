import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import {getAncestors} from './get-ancestors'
import {getNode} from './get-node'

/**
 * Find the highest (closest to root) object node at or above the given path.
 *
 * Checks ancestors from furthest to nearest, returning the first object node
 * found. If no ancestor is an object node, checks the node at the path itself.
 */
export function getHighestObjectNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: PortableTextObject; path: Array<number>} | undefined {
  // Walk ancestors from furthest (root) to nearest, return the first object node
  const ancestors = getAncestors(context, path)

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors.at(i)!

    if (isObjectNode({schema: context.schema}, ancestor.node)) {
      return {node: ancestor.node, path: ancestor.path}
    }
  }

  // No ancestor is an object node - check the node at the path itself
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isObjectNode({schema: context.schema}, entry.node)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
