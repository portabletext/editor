import type {OfDefinition} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {lookupContainer} from '../schema/lookup-container'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the children of a node at a given path.
 */
export function getChildren(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  let currentChildren: Array<Node> = snapshot.context.value
  let scopePath = ''
  let currentFieldName = 'value'
  let currentPath: Path = []
  let isRoot = true

  for (const segment of path) {
    if (typeof segment === 'string') {
      continue
    }

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      node = currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
    }

    if (!node) {
      return []
    }

    currentPath = isRoot
      ? [{_key: node._key}]
      : [...currentPath, currentFieldName, {_key: node._key}]
    isRoot = false

    const next = getNodeChildren(snapshot.context, node, scopePath)

    if (!next) {
      return []
    }

    currentChildren = next.children
    scopePath = next.scopePath
    currentFieldName = next.fieldName
  }

  return currentChildren.map((child) => ({
    node: child,
    path: isRoot
      ? [{_key: child._key}]
      : [...currentPath, currentFieldName, {_key: child._key}],
  }))
}

export function getNodeChildren(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  node: Node | {value: Array<Node>},
  scopePath: string,
):
  | {
      children: Array<Node>
      scope: ReadonlyArray<OfDefinition> | undefined
      scopePath: string
      fieldName: string
    }
  | undefined {
  // Text blocks store children in .children
  if (isTextBlock(context, node)) {
    return {
      children: node.children,
      scope: undefined,
      scopePath: '',
      fieldName: 'children',
    }
  }

  if (isObjectNode(context, node)) {
    const scopedKey = scopePath ? `${scopePath}.${node._type}` : node._type

    const arrayField = lookupContainer(context.containers, scopedKey)?.field

    if (!arrayField) {
      return undefined
    }

    const fieldValue = (node as Record<string, unknown>)[arrayField.name]

    if (!Array.isArray(fieldValue)) {
      return undefined
    }

    return {
      children: fieldValue as Array<Node>,
      scope: arrayField.of,
      scopePath: scopedKey,
      fieldName: arrayField.name,
    }
  }

  // Root context: has .value array but no _key or _type
  if (
    'value' in node &&
    Array.isArray(node['value']) &&
    !('_key' in node) &&
    !('_type' in node)
  ) {
    return {
      children: node['value'] as Array<Node>,
      scope: undefined,
      scopePath: '',
      fieldName: 'value',
    }
  }

  return undefined
}
