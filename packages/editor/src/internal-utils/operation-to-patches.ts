import {
  diffMatchPatch,
  insert,
  setIfMissing,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getSpanNode} from '../node-traversal/get-span-node'
import type {ResolvedContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
} from '../slate/interfaces/operation'

function spanContext(
  schema: EditorSchema,
  containers: ResolvedContainers,
  value: Array<Node>,
): {
  schema: EditorSchema
  containers: ResolvedContainers
  value: Array<Node>
} {
  return {schema, containers, value}
}

export function textPatch(
  schema: EditorSchema,
  containers: ResolvedContainers,
  children: Node[],
  operation: InsertTextOperation | RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const span = getSpanNode(
    spanContext(schema, containers, children),
    operation.path,
  )
  if (!span) {
    return []
  }
  const prevSpan = getSpanNode(
    spanContext(schema, containers, beforeValue as Array<Node>),
    operation.path,
  )
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
