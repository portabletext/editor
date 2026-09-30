import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {getNodeChildren} from '../traversal/get-children'
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
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): string | undefined {
  const lastSegment = path[path.length - 1]

  if (lastSegment === undefined || typeof lastSegment === 'string') {
    return undefined
  }

  return resolveNodeChildren(context, path)?.nodeChildren?.fieldName
}

/**
 * Returns `undefined` when `path` does not resolve, and `{nodeChildren:
 * undefined}` when it resolves to a leaf. The empty path resolves to the
 * document value.
 */
export function resolveNodeChildren(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
):
  | {
      nodeChildren:
        | {
            children: Array<Node>
            fieldName: string
            parent: RegisteredContainer | undefined
          }
        | undefined
    }
  | undefined {
  let nodeChildren = getNodeChildren(context, {value: context.value})

  for (const segment of path) {
    if (typeof segment === 'string') {
      continue
    }

    if (!nodeChildren) {
      return undefined
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

    nodeChildren = getNodeChildren(context, node, nodeChildren.parent)
  }

  return {nodeChildren}
}
