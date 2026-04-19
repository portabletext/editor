import type {OfDefinition} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Get the children of a node at a given path.
 */
export function getChildren(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): Array<{node: Node; path: Path}> {
  const traversalContext = {
    schema: context.schema,
    containers: context.containers,
  }
  return getChildrenInternal(traversalContext, {value: context.value}, path)
}

export function getChildrenInternal(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  root: Node | {value: Array<Node>},
  path: Path,
): Array<{node: Node; path: Path}> {
  const rootChildren = getNodeChildren(context, root, '')

  if (!rootChildren) {
    return []
  }

  let currentChildren = rootChildren.children
  let scopePath = rootChildren.scopePath
  let currentFieldName = rootChildren.fieldName
  let currentPath: Path = []
  // The editor root wrapper ({value: [...]}) is not a real node, so its field
  // name is not part of paths. Block paths start with [{_key: 'blockKey'}],
  // not ['value', {_key: 'blockKey'}]. But for standalone nodes (e.g., a text
  // block passed to getNodeDescendants), the field name IS part of the path.
  let isRoot = !('_key' in root) && !('_type' in root)

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

    const next = getNodeChildren(context, node, scopePath)

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

    const arrayField = context.containers.get(scopedKey)?.field

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
