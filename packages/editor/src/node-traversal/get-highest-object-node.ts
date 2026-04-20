import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {TraversalContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isVoidNode} from '../slate/node/is-void-node'
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
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextObject; path: Path} | undefined {
  // Walk ancestors from furthest (root) to nearest, return the first object node
  const ancestors = getAncestors(context, path)

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i]

    if (!ancestor) {
      continue
    }

    if (isVoidNode(context, ancestor.node, ancestor.path)) {
      return {node: ancestor.node, path: ancestor.path}
    }
  }

  // No ancestor is an object node - check the node at the path itself
  const entry = getNode(context, path)

  if (!entry) {
    return undefined
  }

  if (!isVoidNode(context, entry.node, entry.path)) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
