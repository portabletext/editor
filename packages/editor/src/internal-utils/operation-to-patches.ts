import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {isSpan, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getNodeChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getChildFieldName} from '../paths/get-child-field-name'
import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertNodeOperation,
  InsertTextOperation,
  RemoveNodeOperation,
  RemoveTextOperation,
  SetNodeOperation,
} from '../slate/interfaces/operation'
import type {Path} from '../types/paths'
import {safeStringify} from './safe-json'

interface OperationContext {
  schema: EditorSchema
  editableTypes: Set<string>
  value: Array<Node>
}

/**
 * Walk from root to the node at the given path, accumulating the scope chain,
 * then return the node's children info with the correct scope for
 * `editableTypes` resolution.
 */
function getChildrenOfNodeAtPath(
  context: OperationContext,
  path: Array<number>,
):
  | {
      children: Array<Node>
      fieldName: string
    }
  | undefined {
  let currentChildren: Array<Node> = context.value
  let scope: Parameters<typeof getNodeChildren>[2]
  let scopePath = ''

  for (let i = 0; i < path.length; i++) {
    const node = currentChildren.at(path.at(i)!)

    if (!node) {
      return undefined
    }

    const next = getNodeChildren(
      {schema: context.schema, editableTypes: context.editableTypes},
      node,
      scope,
      scopePath,
    )

    if (!next) {
      return undefined
    }

    if (i === path.length - 1) {
      return {children: next.children, fieldName: next.fieldName}
    }

    currentChildren = next.children
    scope = next.scope
    scopePath = next.scopePath
  }

  return undefined
}

export function insertTextPatch(
  context: OperationContext,
  operation: InsertTextOperation,
  beforeValue: Array<Node>,
): Array<Patch> {
  const nodeResult = getNode(context, operation.path)

  if (!nodeResult) {
    return []
  }

  if (!isSpan(context, nodeResult.node)) {
    return []
  }

  const keyedPath = indexedPathToKeyedPath(context, operation.path)

  if (!keyedPath) {
    return []
  }

  const path: Path = [...keyedPath, 'text']

  const beforeContext: OperationContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
    value: beforeValue,
  }
  const previousNodeResult = getNode(beforeContext, operation.path)
  const previousText =
    previousNodeResult && isSpan(context, previousNodeResult.node)
      ? previousNodeResult.node.text
      : ''

  const patch = diffMatchPatch(previousText, nodeResult.node.text, path)
  return patch.value.length ? [patch] : []
}

export function removeTextPatch(
  context: OperationContext,
  operation: RemoveTextOperation,
  beforeValue: Array<Node>,
): Array<Patch> {
  const nodeResult = getNode(context, operation.path)

  if (!nodeResult) {
    return []
  }

  if (!isSpan(context, nodeResult.node)) {
    return []
  }

  const keyedPath = indexedPathToKeyedPath(context, operation.path)

  if (!keyedPath) {
    return []
  }

  const path: Path = [...keyedPath, 'text']

  const beforeContext: OperationContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
    value: beforeValue,
  }
  const previousNodeResult = getNode(beforeContext, operation.path)
  const previousText =
    previousNodeResult && isSpan(context, previousNodeResult.node)
      ? previousNodeResult.node.text
      : ''

  const patch = diffMatchPatch(previousText, nodeResult.node.text, path)
  return patch.value ? [patch] : []
}

export function setNodePatch(
  context: OperationContext,
  operation: SetNodeOperation,
): Array<Patch> {
  const nodeResult = getNode(context, operation.path)

  if (!nodeResult) {
    console.error('Could not find node at path', safeStringify(operation.path))
    return []
  }

  const keyedPath = indexedPathToKeyedPath(context, operation.path)

  if (!keyedPath) {
    // The full path can't be resolved to keyed segments (e.g., an intermediate
    // node lacks _key during normalization). Fall back to resolving the parent
    // path and using a numeric index for the last segment.
    const parentPath = operation.path.slice(0, -1)
    const parentKeyedPath =
      parentPath.length > 0
        ? indexedPathToKeyedPath(context, parentPath)
        : undefined
    const lastIndex = operation.path.at(-1)

    if (!parentKeyedPath || lastIndex === undefined) {
      return []
    }

    // Resolve the child field name for the parent
    const childFieldName = getChildFieldName(context, parentPath)

    if (!childFieldName) {
      return []
    }

    const patches: Patch[] = []

    for (const [key, propertyValue] of Object.entries(
      operation.newProperties,
    )) {
      patches.push(
        set(propertyValue, [
          ...parentKeyedPath,
          childFieldName,
          lastIndex,
          key,
        ]),
      )
    }

    return patches
  }

  const patches: Patch[] = []

  // Handle _key changes specially: use numeric index for the last segment
  // because the key is what's being changed
  const newKey = operation.newProperties._key

  if (newKey !== undefined) {
    // Build a path with numeric index for the last segment
    const lastIndex = operation.path.at(-1)

    if (lastIndex !== undefined) {
      if (keyedPath.length <= 1) {
        // Block-level: path is just [numericIndex, '_key']
        patches.push(set(newKey, [lastIndex, '_key']))
      } else {
        // Child-level: path is [...parentKeyedPath, fieldName, numericIndex, '_key']
        const parentKeyedPath = keyedPath.slice(0, -1)
        patches.push(set(newKey, [...parentKeyedPath, lastIndex, '_key']))
      }
    }
  }

  for (const [key, propertyValue] of Object.entries(operation.newProperties)) {
    if (key === '_key') {
      continue
    }

    patches.push(set(propertyValue, [...keyedPath, key]))
  }

  for (const key of Object.keys(operation.properties)) {
    if (key === '_key') {
      continue
    }

    if (!(key in operation.newProperties)) {
      patches.push(unset([...keyedPath, key]))
    }
  }

  return patches
}

export function insertNodePatch(
  context: OperationContext,
  operation: InsertNodeOperation,
  beforeValue: Array<Node>,
): Array<Patch> {
  const beforeContext: OperationContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
    value: beforeValue,
  }

  if (operation.path.length === 1) {
    // Inserting a block at the root level
    const insertIndex = operation.path.at(0)!
    const position = insertIndex === 0 ? 'before' : 'after'
    const referenceBlock =
      insertIndex === 0
        ? beforeValue.at(insertIndex)
        : beforeValue.at(insertIndex - 1)
    const targetKey = referenceBlock?._key

    if (targetKey) {
      return [
        insert([operation.node as PortableTextBlock], position, [
          {_key: targetKey},
        ]),
      ]
    }

    return [
      setIfMissing(beforeValue, []),
      insert([operation.node as PortableTextBlock], 'before', [insertIndex]),
    ]
  }

  // Inserting a child into a parent's child array (depth >= 2)
  const parentPath = operation.path.slice(0, -1)
  const childIndex = operation.path.at(-1)!

  const parentResult = getNode(beforeContext, parentPath)

  if (!parentResult) {
    return []
  }

  // Verify the parent still exists in the AFTER state
  const afterParentResult = getNode(context, parentPath)

  if (!afterParentResult) {
    return []
  }

  const parentKeyedPath = indexedPathToKeyedPath(beforeContext, parentPath)

  if (!parentKeyedPath) {
    return []
  }

  // Get the children of the parent to find the field name and child node.
  const childrenInfo = getChildrenOfNodeAtPath(context, parentPath)

  if (!childrenInfo) {
    return []
  }

  const {children: parentChildren, fieldName} = childrenInfo

  const previousChild =
    childIndex > 0 ? parentChildren.at(childIndex - 1) : undefined

  const position =
    parentChildren.length === 0 || !previousChild ? 'before' : 'after'

  const insertPath: Path =
    parentChildren.length <= 1 || !previousChild
      ? [...parentKeyedPath, fieldName, 0]
      : [...parentKeyedPath, fieldName, {_key: previousChild._key}]

  const setIfMissingPatch = setIfMissing([], [...parentKeyedPath, fieldName])

  return [setIfMissingPatch, insert([operation.node], position, insertPath)]
}

export function removeNodePatch(
  beforeContext: OperationContext,
  operation: RemoveNodeOperation,
): Array<Patch> {
  if (operation.path.length === 1) {
    // Remove a block at the root level
    const blockResult = getNode(beforeContext, operation.path)

    if (!blockResult) {
      return []
    }

    return [unset([{_key: blockResult.node._key}])]
  }

  // Remove a child from a parent's child array (depth >= 2)
  const parentPath = operation.path.slice(0, -1)
  const parentResult = getNode(beforeContext, parentPath)

  if (!parentResult) {
    return []
  }

  const childrenInfo = getChildrenOfNodeAtPath(beforeContext, parentPath)

  if (!childrenInfo) {
    return []
  }

  const childIndex = operation.path.at(-1)!
  const childToRemove = childrenInfo.children.at(childIndex)

  if (!childToRemove) {
    return []
  }

  // Check for duplicate keys
  const matchingKeyChildren = childrenInfo.children.filter(
    (child) => child._key === operation.node._key,
  )

  if (matchingKeyChildren.length > 1) {
    console.warn(
      `Multiple children have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
      safeStringify(parentResult.node, 2),
    )
    return []
  }

  const parentKeyedPath = indexedPathToKeyedPath(beforeContext, parentPath)

  if (!parentKeyedPath) {
    return []
  }

  return [
    unset([
      ...parentKeyedPath,
      childrenInfo.fieldName,
      {_key: childToRemove._key},
    ]),
  ]
}
