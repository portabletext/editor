import type {EditorSchema} from '../editor/editor-schema'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getChildren} from './get-children'
import {getNode} from './get-node'

/**
 * Get the deepest leaf node starting from a path, walking toward either the
 * start or end edge. A leaf is any node that has no children according to the
 * traversal context.
 */
export function getLeaf(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
    value: Array<Node>
  },
  path: Path,
  options: {edge: 'start' | 'end'},
): {node: Node; path: Path} | undefined {
  const {edge} = options

  let currentPath = path

  // If starting from root (empty path), descend into first/last child
  if (currentPath.length === 0) {
    const children = getChildren(context, [])
    if (children.length === 0) {
      return undefined
    }
    const firstOrLast = edge === 'end' ? children.at(-1)! : children.at(0)!
    const nodeChildren = getChildren(context, firstOrLast.path)
    if (nodeChildren.length === 0) {
      return firstOrLast
    }
    currentPath = firstOrLast.path
  } else {
    // Check if the node at path is already a leaf
    const entry = getNode(context, currentPath)
    if (!entry) {
      return undefined
    }
    const children = getChildren(context, currentPath)
    if (children.length === 0) {
      return entry
    }
  }

  // Descend to deepest leaf
  while (true) {
    const children = getChildren(context, currentPath)
    if (children.length === 0) {
      const entry = getNode(context, currentPath)
      return entry ?? undefined
    }
    const child = edge === 'end' ? children.at(-1)! : children.at(0)!
    currentPath = child.path
  }
}
