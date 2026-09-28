import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {
  EngineOperation,
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
} from '../engine/interfaces/operation'
import {getSpan} from '../traversal/get-span'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

export function operationToPatches(
  operation: EngineOperation,
  {
    beforeValue,
    afterSnapshot,
  }: {
    beforeValue: Array<PortableTextBlock>
    afterSnapshot: TraversalSnapshot
  },
): Array<Patch> {
  switch (operation.type) {
    case 'insert.text':
    case 'remove.text':
      return textPatch(afterSnapshot, operation, beforeValue)
    case 'insert':
      return insertNodePatch(operation)
    case 'set':
      return [set(operation.value, operation.path)]
    case 'unset':
      return [unset(operation.path)]
    case 'set.selection':
      return []
  }
}

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
    blockIndexMap: snapshot.blockIndexMap,
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
