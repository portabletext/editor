import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {getChildrenAt} from './get-children'
import {getNode} from './get-node'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the deepest leaf node starting from a path, walking toward either the
 * start or end edge. A leaf is any node that has no children according to the
 * traversal context.
 *
 * @beta
 */
export function getLeaf(
  snapshot: TraversalSnapshot,
  path: Path,
  options: {edge: 'start' | 'end'},
): {node: Node; path: Path} | undefined {
  const {edge} = options

  let currentPath = path

  // If starting from root (empty path), descend into first/last child
  if (currentPath.length === 0) {
    const children = getChildrenAt(snapshot, [])
    if (children.length === 0) {
      return undefined
    }
    const firstOrLast = edge === 'end' ? children.at(-1)! : children.at(0)!
    const nodeChildren = getChildrenAt(snapshot, firstOrLast.path)
    if (nodeChildren.length === 0) {
      return firstOrLast
    }
    currentPath = firstOrLast.path
  } else {
    // Check if the node at path is already a leaf
    const entry = getNode(snapshot, currentPath)
    if (!entry) {
      return undefined
    }
    const children = getChildrenAt(snapshot, currentPath)
    if (children.length === 0) {
      return entry
    }
  }

  // Descend to deepest leaf
  while (true) {
    const children = getChildrenAt(snapshot, currentPath)
    if (children.length === 0) {
      const entry = getNode(snapshot, currentPath)
      return entry ?? undefined
    }
    const child = edge === 'end' ? children.at(-1)! : children.at(0)!
    currentPath = child.path
  }
}
