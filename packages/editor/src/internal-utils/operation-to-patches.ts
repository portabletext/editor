import {
  diffMatchPatch,
  insert,
  setIfMissing,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {getSpanNode} from '../node-traversal/get-span-node'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
} from '../slate/interfaces/operation'

export function textPatch(
  snapshot: TraversalSnapshot,
  operation: InsertTextOperation | RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const span = getSpanNode(snapshot, operation.path)
  if (!span) {
    return []
  }
  const beforeSnapshot: TraversalSnapshot = {
    context: {
      schema: snapshot.context.schema,
      containers: snapshot.context.containers,
      value: beforeValue as Array<Node>,
    },
    blockIndexMap: new Map(),
  }
  const prevSpan = getSpanNode(beforeSnapshot, operation.path)
  const patch = diffMatchPatch(prevSpan?.node.text ?? '', span.node.text, [
    ...operation.path,
    'text',
  ])
  return patch.value.length ? [patch] : []
}

export function insertNodePatch(operation: InsertOperation): Array<Patch> {
  const childFieldPath = operation.path.slice(0, -1)

  if (childFieldPath.length === 0) {
    return [insert([operation.node], operation.position, operation.path)]
  }

  return [
    setIfMissing([], childFieldPath),
    insert([operation.node], operation.position, operation.path),
  ]
}
