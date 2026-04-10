import {
  diffMatchPatch,
  insert,
  setIfMissing,
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
} from '../slate/interfaces/operation'

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
