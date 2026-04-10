import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getSpanNode} from '../node-traversal/get-span-node'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertNodeOperation,
  InsertTextOperation,
  RemoveTextOperation,
  SetNodeOperation,
} from '../slate/interfaces/operation'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

function spanContext(
  schema: EditorSchema,
  value: Array<Node>,
): {
  schema: EditorSchema
  editableTypes: EditableTypes
  value: Array<Node>
} {
  return {schema, editableTypes: new Map(), value}
}

export function textPatch(
  schema: EditorSchema,
  children: Node[],
  operation: InsertTextOperation | RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const span = getSpanNode(spanContext(schema, children), operation.path)
  if (!span) {
    return []
  }
  const prevSpan = getSpanNode(
    spanContext(schema, beforeValue as Array<Node>),
    operation.path,
  )
  const patch = diffMatchPatch(prevSpan?.node.text ?? '', span.node.text, [
    ...operation.path,
    'text',
  ])
  return patch.value.length ? [patch] : []
}

export function setNodePatch(
  children: Node[],
  operation: SetNodeOperation,
): Array<Patch> {
  const firstSegment = operation.path[0]
  if (firstSegment === undefined) {
    return []
  }

  // After apply(operation), children already has the new key.
  // Use newProperties._key when looking up the block.
  const newBlockKey =
    operation.path.length === 1 &&
    typeof operation.newProperties._key === 'string'
      ? operation.newProperties._key
      : undefined

  let block: Node | undefined
  if (isKeyedSegment(firstSegment)) {
    block = children.find((c) => c._key === (newBlockKey ?? firstSegment._key))
  } else if (typeof firstSegment === 'number') {
    block = children[firstSegment]
  }

  if (!block) {
    return []
  }

  // Block-level set_node
  if (operation.path.length === 1) {
    return setNodePatches(children, block, operation)
  }

  // Child-level set_node: walk the path to find the target node and its siblings.
  // The path alternates between field names (strings) and node segments (keyed or
  // numeric). We walk down from the block, resolving each field name to get the
  // children array, then finding the node within it.
  const newChildKey =
    typeof operation.newProperties._key === 'string'
      ? operation.newProperties._key
      : undefined

  let currentNode: Node = block
  let siblings: ArrayLike<Node> = children
  let parentPath: Path = []

  for (let i = 1; i < operation.path.length; i++) {
    const segment = operation.path[i]

    if (typeof segment === 'string') {
      // Field name segment: resolve the children array
      const fieldValue = (currentNode as Record<string, unknown>)[segment]
      if (!Array.isArray(fieldValue)) {
        return []
      }
      siblings = fieldValue as Node[]
      parentPath = [...parentPath, {_key: currentNode._key}, segment]
      continue
    }

    // Node segment: find the node in the current siblings array
    const isLastSegment = i === operation.path.length - 1
    const lookupKey = isLastSegment ? newChildKey : undefined

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      node = Array.prototype.find.call(
        siblings,
        (c: Node) => c._key === (lookupKey ?? segment._key),
      )
    } else if (typeof segment === 'number') {
      node = (siblings as Node[])[segment]
      if (lookupKey && node) {
        node =
          Array.prototype.find.call(
            siblings,
            (c: Node) => c._key === lookupKey,
          ) ?? node
      }
    }

    if (!node) {
      return []
    }

    if (isLastSegment) {
      return setNodePatches(siblings, node, operation, parentPath)
    }

    currentNode = node
  }

  return []
}

/**
 * Produce set/unset patches for a set_node operation on a specific node.
 *
 * `_key` changes use numeric index (Sanity protocol requires positional
 * addressing for key changes). All other properties use keyed paths.
 */
function setNodePatches(
  siblings: ArrayLike<Node>,
  node: Node,
  operation: SetNodeOperation,
  parentPath: Path = [],
): Array<Patch> {
  const patches: Patch[] = []
  const nodeIndex = Array.prototype.indexOf.call(siblings, node)

  for (const [key, value] of Object.entries(operation.newProperties)) {
    if (key === '_key') {
      patches.push(set(value, [...parentPath, nodeIndex, '_key']))
    } else {
      patches.push(set(value, [...parentPath, {_key: node._key}, key]))
    }
  }

  for (const key of Object.keys(operation.properties)) {
    if (key === '_key') {
      continue
    }
    if (!(key in operation.newProperties)) {
      patches.push(unset([...parentPath, {_key: node._key}, key]))
    }
  }

  return patches
}

export function insertNodePatch(operation: InsertNodeOperation): Array<Patch> {
  const childFieldPath = operation.path.slice(0, -1)

  if (childFieldPath.length === 0) {
    return [insert([operation.node], operation.position, operation.path)]
  }

  return [
    setIfMissing([], childFieldPath),
    insert([operation.node], operation.position, operation.path),
  ]
}
