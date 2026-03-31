import type {EditorSchema} from '../editor/editor-schema'
import {getNodeChildren} from '../node-traversal/get-children'
import type {Node} from '../slate/interfaces/node'

/**
 * Walk the tree to the node at the given indexed path and return the field
 * name of its child array (e.g. 'children', 'rows', 'cells').
 *
 * Returns undefined for leaf nodes (spans, inline objects) that have no
 * child array.
 */
export function getChildFieldName(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): string | undefined {
  let nodeChildren = getNodeChildren(
    {schema: context.schema, editableTypes: context.editableTypes},
    {value: context.value},
    undefined,
    '',
  )

  for (let i = 0; i < path.length; i++) {
    if (!nodeChildren) {
      return undefined
    }
    const index = path.at(i)

    if (index === undefined) {
      return undefined
    }

    const node = nodeChildren.children.at(index)

    if (!node) {
      return undefined
    }

    if (i === path.length - 1) {
      const targetInfo = getNodeChildren(
        {schema: context.schema, editableTypes: context.editableTypes},
        node,
        nodeChildren.scope,
        nodeChildren.scopePath,
      )
      return targetInfo?.fieldName
    }

    nodeChildren = getNodeChildren(
      {schema: context.schema, editableTypes: context.editableTypes},
      node,
      nodeChildren.scope,
      nodeChildren.scopePath,
    )
  }

  return undefined
}
