import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getChildren, getNodeChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import {resolveChildArrayField} from '../schema/resolve-child-array-field'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertNodeOperation,
  InsertTextOperation,
  RemoveNodeOperation,
  RemoveTextOperation,
  SetNodeOperation,
} from '../slate/interfaces/operation'
import {isObjectNode} from '../slate/node/is-object-node'
import type {Path} from '../types/paths'

export type PatchContext = {
  schema: EditorSchema
  editableTypes: Set<string>
  value: Array<Node>
}

/**
 * Builds the keyed path to the parent of the node at `path`, including the
 * child array field name. Used by `insertNodePatch` to construct paths like
 * `[{_key: block._key}, 'children']`.
 *
 * For path `[0]`: returns `[]` (top-level, no parent field)
 * For path `[0, 1]`: returns `[{_key: block._key}, 'children']`
 * For path `[0, 0, 0]`: returns `[{_key: container._key}, 'content', {_key: block._key}, 'children']`
 */
function resolveParentFieldPath(
  context: PatchContext,
  path: Array<number>,
): Path | undefined {
  if (path.length <= 1) {
    return []
  }

  const parentPath = path.slice(0, -1)
  const parentKeyedPath = indexedPathToKeyedPath(
    {children: context.value},
    parentPath,
    context.schema,
  )

  if (!parentKeyedPath) {
    return undefined
  }

  // Walk the tree to the parent node, tracking scope so we can resolve
  // the correct child array field for nested container types.
  let currentChildren: Array<Node> = context.value
  let scope: Parameters<typeof resolveChildArrayField>[0]['scope']
  let scopePath = ''

  for (let index = 0; index < parentPath.length; index++) {
    const segmentIndex = parentPath.at(index)

    if (segmentIndex === undefined) {
      return undefined
    }

    const node = currentChildren.at(segmentIndex)

    if (!node) {
      return undefined
    }

    if (index < parentPath.length - 1) {
      const next = getNodeChildren(
        {schema: context.schema, editableTypes: context.editableTypes},
        node,
        scope,
        scopePath,
      )

      if (!next) {
        return undefined
      }

      currentChildren = next.children
      scope = next.scope
      scopePath = next.scopePath
    } else {
      // Reached the parent node - determine its child field name
      if (isTextBlock(context, node)) {
        return [...parentKeyedPath, 'children']
      }

      if (isObjectNode(context, node)) {
        const arrayField = resolveChildArrayField(
          {schema: context.schema, scope},
          node,
        )

        if (!arrayField) {
          return undefined
        }

        return [...parentKeyedPath, arrayField.name]
      }

      return undefined
    }
  }

  return undefined
}

export function insertTextPatch(
  context: PatchContext,
  operation: InsertTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const node = getNode(context, operation.path)?.node

  if (!node || !isSpan(context, node)) {
    console.error('Unable to find span')
    return []
  }

  const previousNode = getNode(
    {
      schema: context.schema,
      editableTypes: context.editableTypes,
      value: beforeValue,
    },
    operation.path,
  )?.node

  if (!previousNode || !isSpan(context, previousNode)) {
    console.error('Unable to find previous version of span')
    return []
  }

  const keyedPath = indexedPathToKeyedPath(
    {children: context.value},
    operation.path,
    context.schema,
  )

  if (!keyedPath) {
    console.error('Unable to convert indexed path to keyed path')
    return []
  }

  const patch = diffMatchPatch(previousNode.text, node.text, [
    ...keyedPath,
    'text',
  ])

  return patch.value ? [patch] : []
}

export function removeTextPatch(
  context: PatchContext,
  operation: RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const node = getNode(context, operation.path)?.node

  if (!node || !isSpan(context, node)) {
    console.error('Unable to find span')
    return []
  }

  const previousNode = getNode(
    {
      schema: context.schema,
      editableTypes: context.editableTypes,
      value: beforeValue,
    },
    operation.path,
  )?.node

  if (!previousNode || !isSpan(context, previousNode)) {
    console.error('Unable to find previous version of span')
    return []
  }

  const keyedPath = indexedPathToKeyedPath(
    {children: context.value},
    operation.path,
    context.schema,
  )

  if (!keyedPath) {
    console.error('Unable to convert indexed path to keyed path')
    return []
  }

  const patch = diffMatchPatch(previousNode.text, node.text, [
    ...keyedPath,
    'text',
  ])

  return patch.value ? [patch] : []
}

export function setNodePatch(
  context: PatchContext,
  operation: SetNodeOperation,
): Array<Patch> {
  const keyedPath = indexedPathToKeyedPath(
    {children: context.value},
    operation.path,
    context.schema,
  )

  if (!keyedPath) {
    console.error('Unable to convert indexed path to keyed path')
    return []
  }

  const patches: Patch[] = []
  const lastIndex = operation.path.at(-1)

  // Build the positional path prefix for _key changes.
  // For top-level blocks: just the block index.
  // For children: parent keyed path + child field name + child index.
  // We derive this by stripping the last key segment from the full keyed path.
  const parentFieldPath =
    operation.path.length <= 1 ? [] : keyedPath.slice(0, -1)

  for (const [propertyName, propertyValue] of Object.entries(
    operation.newProperties,
  )) {
    if (propertyName === '_key') {
      if (lastIndex !== undefined) {
        patches.push(
          set(propertyValue, [...parentFieldPath, lastIndex, '_key']),
        )
      }
      continue
    }

    patches.push(set(propertyValue, [...keyedPath, propertyName]))
  }

  for (const propertyName of Object.keys(operation.properties)) {
    if (!(propertyName in operation.newProperties)) {
      patches.push(unset([...keyedPath, propertyName]))
    }
  }

  return patches
}

export function insertNodePatch(
  context: PatchContext,
  operation: InsertNodeOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  if (operation.path.length === 1) {
    const insertIndex = operation.path.at(0)

    if (insertIndex === undefined) {
      return []
    }

    const position = insertIndex === 0 ? 'before' : 'after'
    const referenceBlock =
      insertIndex === 0
        ? beforeValue.at(insertIndex)
        : beforeValue.at(insertIndex - 1)
    const targetKey = referenceBlock?._key

    if (targetKey) {
      return [insert([operation.node], position, [{_key: targetKey}])]
    }

    return [
      setIfMissing(beforeValue, []),
      insert([operation.node], 'before', [insertIndex]),
    ]
  }

  // Verify the parent block still exists in the current state
  const firstIndex = operation.path.at(0)

  if (firstIndex === undefined) {
    return []
  }

  const currentBlock = context.value.at(firstIndex)

  if (!currentBlock) {
    return []
  }

  const beforeContext: PatchContext = {
    schema: context.schema,
    editableTypes: context.editableTypes,
    value: beforeValue,
  }

  const parentFieldPath = resolveParentFieldPath(beforeContext, operation.path)

  if (!parentFieldPath) {
    return []
  }

  const parentPath = operation.path.slice(0, -1)
  const parentChildren = getChildren(beforeContext, parentPath)

  const childIndex = operation.path.at(-1)

  if (childIndex === undefined) {
    return []
  }

  const previousSibling =
    childIndex > 0 ? parentChildren.at(childIndex - 1) : undefined

  const position =
    parentChildren.length === 0 || !previousSibling ? 'before' : 'after'

  const insertPath =
    parentChildren.length <= 1 || !previousSibling
      ? [...parentFieldPath, 0]
      : [...parentFieldPath, {_key: previousSibling.node._key}]

  const setIfMissingPatch = setIfMissing([], parentFieldPath)

  return [setIfMissingPatch, insert([operation.node], position, insertPath)]
}

export function removeNodePatch(
  context: PatchContext,
  operation: RemoveNodeOperation,
): Array<Patch> {
  if (operation.path.length === 1) {
    const firstIndex = operation.path.at(0)

    if (firstIndex === undefined) {
      console.error('Unable to find block')
      return []
    }

    const block = context.value.at(firstIndex)

    if (block && block._key) {
      return [unset([{_key: block._key}])]
    }

    console.error('Unable to find block')
    return []
  }

  const keyedPath = indexedPathToKeyedPath(
    {children: context.value},
    operation.path,
    context.schema,
  )

  if (!keyedPath) {
    return []
  }

  // Check for duplicate keys among siblings
  const parentPath = operation.path.slice(0, -1)
  const siblingChildren = getChildren(context, parentPath)

  if (siblingChildren.length > 0) {
    const matchingKeyCount = siblingChildren.filter(
      (sibling) => sibling.node._key === operation.node._key,
    ).length

    if (matchingKeyCount > 1) {
      console.warn(
        `Multiple children have \`_key\` ${operation.node._key}. It's ambiguous which one to remove.`,
      )
      return []
    }
  }

  return [unset(keyedPath)]
}
