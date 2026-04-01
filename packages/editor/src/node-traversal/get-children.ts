import type {OfDefinition} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {resolveChildArrayField} from '../schema/resolve-child-array-field'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'

/**
 * Get the children of a node at a given path.
 */
export function getChildren(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    value: Array<Node>
  },
  path: Array<number>,
): Array<{node: Node; path: Array<number>}> {
  const traversalContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
  }
  return getChildrenInternal(traversalContext, {value: context.value}, path)
}

export function getChildrenInternal(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  root: Node | {value: Array<Node>},
  path: Array<number>,
): Array<{node: Node; path: Array<number>}> {
  const rootChildren = getNodeChildren(context, root, undefined, '')

  if (!rootChildren) {
    return []
  }

  let currentChildren = rootChildren.children
  let currentScope = rootChildren.scope
  let scopePath = rootChildren.scopePath
  let currentPath: Array<number> = []

  for (const index of path) {
    const node = currentChildren[index]

    if (!node) {
      return []
    }

    currentPath = [...currentPath, index]

    const next = getNodeChildren(context, node, currentScope, scopePath)

    if (!next) {
      return []
    }

    currentChildren = next.children
    currentScope = next.scope
    scopePath = next.scopePath
  }

  return currentChildren.map((child, index) => ({
    node: child,
    path: [...currentPath, index],
  }))
}

// Reusable result objects to avoid allocations in hot paths.
// Safe because callers read the fields immediately and don't store references.
const _textBlockResult: {
  children: Array<Node>
  scope: ReadonlyArray<OfDefinition> | undefined
  scopePath: string
  fieldName: string
} = {children: [], scope: undefined, scopePath: '', fieldName: 'children'}

const _rootResult: {
  children: Array<Node>
  scope: ReadonlyArray<OfDefinition> | undefined
  scopePath: string
  fieldName: string
} = {children: [], scope: undefined, scopePath: '', fieldName: 'value'}

export function getNodeChildren(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
  },
  node: Node | {value: Array<Node>},
  scope: ReadonlyArray<OfDefinition> | undefined,
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
    _textBlockResult.children = node.children
    return _textBlockResult
  }

  if (isObjectNode(context, node)) {
    const scopedKey = scopePath ? `${scopePath}.${node._type}` : node._type

    if (!context.editableTypes.has(scopedKey)) {
      return undefined
    }

    const arrayField = resolveChildArrayField(
      {schema: context.schema, scope},
      node,
    )

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
    _rootResult.children = node['value'] as Array<Node>
    return _rootResult
  }

  return undefined
}
