import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getSpanNode} from '../node-traversal/get-span-node'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertNodeOperation,
  InsertTextOperation,
  RemoveTextOperation,
  SetNodeOperation,
} from '../slate/interfaces/operation'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

function spanContext(schema: EditorSchema, value: Array<Node>) {
  return {schema, editableTypes: new Set<string>(), value}
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
  schema: EditorSchema,
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

  // Child-level set_node
  if (operation.path.length === 3 && isTextBlock({schema}, block)) {
    const childSegment = operation.path[2]
    const newChildKey =
      typeof operation.newProperties._key === 'string'
        ? operation.newProperties._key
        : undefined

    let child: (typeof block.children)[number] | undefined
    if (isKeyedSegment(childSegment)) {
      child = block.children.find(
        (c) => c._key === (newChildKey ?? childSegment._key),
      )
    } else if (typeof childSegment === 'number') {
      child = block.children[childSegment]
      if (newChildKey && child) {
        child = block.children.find((c) => c._key === newChildKey) ?? child
      }
    }

    if (!child) {
      return []
    }

    return setNodePatches(block.children, child, operation, [
      {_key: block._key},
      'children',
    ])
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
