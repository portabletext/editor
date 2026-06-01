import {
  diffMatchPatch,
  insert,
  setIfMissing,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
} from '../engine/interfaces/operation'
import {getSpan} from '../traversal/get-span'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

export function textPatch(
  snapshot: TraversalSnapshot,
  operation: InsertTextOperation | RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const span = getSpan(snapshot, operation.path)
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
  const prevSpan = getSpan(beforeSnapshot, operation.path)
  const patch = diffMatchPatch(prevSpan?.node.text ?? '', span.node.text, [
    ...operation.path,
    'text',
  ])
  return patch.value.length ? [patch] : []
}

export function insertNodePatch(operation: InsertOperation): Array<Patch> {
  const arrayFieldPath = operation.path.slice(0, -1)

  if (arrayFieldPath.length === 0) {
    return [insert([operation.node], operation.position, operation.path)]
  }

  return [
    setIfMissing([], arrayFieldPath),
    insert([operation.node], operation.position, operation.path),
  ]
}
