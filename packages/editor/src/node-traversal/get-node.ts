import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNodeChildren} from './get-children'

/**
 * Get the node at a given path.
 */
export function getNode(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): {node: Node; path: Array<number>} | undefined {
  if (path.length === 0) {
    return undefined
  }

  let currentChildren: Array<Node> = context.value
  let scope: Parameters<typeof getNodeChildren>[2] = undefined
  let scopePath = ''
  let node: Node | undefined

  for (let i = 0; i < path.length; i++) {
    node = currentChildren.at(path.at(i)!)

    if (!node) {
      return undefined
    }

    if (i < path.length - 1) {
      const next = getNodeChildren(context, node, scope, scopePath)

      if (!next) {
        return undefined
      }

      currentChildren = next.children
      scope = next.scope
      scopePath = next.scopePath
    }
  }

  if (!node) {
    return undefined
  }

  return {node, path}
}
