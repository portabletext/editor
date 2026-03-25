import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import {getNodeChildren} from './get-children'

/**
 * Determine if a node at the given path is a leaf.
 *
 * A leaf node cannot have children. Spans and non-editable object nodes are
 * leaves. Text blocks and editable container objects are not.
 */
export function isLeaf(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): boolean {
  if (path.length === 0) {
    return false
  }

  const traversalContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
  }

  let currentChildren: Array<Node> = context.value
  let scope: Parameters<typeof getNodeChildren>[2]
  let scopePath = ''

  for (let i = 0; i < path.length; i++) {
    const node = currentChildren[path[i]!]

    if (!node) {
      return false
    }

    const next = getNodeChildren(traversalContext, node, scope, scopePath)

    if (i === path.length - 1) {
      return next === undefined
    }

    if (!next) {
      return false
    }

    currentChildren = next.children
    scope = next.scope
    scopePath = next.scopePath
  }

  return false
}
