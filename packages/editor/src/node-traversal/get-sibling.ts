import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getChildren} from './get-children'

/**
 * Get the next or previous sibling of the node at a given path.
 */
export function getSibling(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
  direction: 'next' | 'previous',
): {node: Node; path: Array<number>} | undefined {
  if (path.length === 0) {
    return undefined
  }

  const parentPath = path.slice(0, -1)
  const index = path.at(-1)

  if (index === undefined) {
    return undefined
  }

  const siblingIndex = direction === 'next' ? index + 1 : index - 1

  if (siblingIndex < 0) {
    return undefined
  }

  const children = getChildren(context, parentPath)

  return children.at(siblingIndex)
}
