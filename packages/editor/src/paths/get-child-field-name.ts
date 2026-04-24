import type {EditorSchema} from '../editor/editor-schema'
import {getNodeChildren} from '../node-traversal/get-children'
import type {ResolvedContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Walk the tree to the node at the given path and return the field
 * name of its child array (e.g. 'children', 'rows', 'cells').
 *
 * Returns undefined for leaf nodes (spans, inline objects) that have no
 * child array.
 */
export function getChildFieldName(
  context: {
    schema: EditorSchema
    containers: ResolvedContainers
    value: Array<Node>
  },
  path: Path,
): string | undefined {
  let nodeChildren = getNodeChildren(
    {schema: context.schema, containers: context.containers},
    {value: context.value},
    '',
  )

  for (let i = 0; i < path.length; i++) {
    if (!nodeChildren) {
      return undefined
    }

    const segment = path[i]

    if (typeof segment === 'string') {
      continue
    }

    let node: Node | undefined

    if (isKeyedSegment(segment)) {
      node = nodeChildren.children.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = nodeChildren.children.at(segment)
    }

    if (!node) {
      return undefined
    }

    if (i === path.length - 1) {
      const targetInfo = getNodeChildren(
        {schema: context.schema, containers: context.containers},
        node,
        nodeChildren.scopePath,
      )
      return targetInfo?.fieldName
    }

    nodeChildren = getNodeChildren(
      {schema: context.schema, containers: context.containers},
      node,
      nodeChildren.scopePath,
    )
  }

  return undefined
}
