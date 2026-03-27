import type {EditorSchema} from '../../editor/editor-schema'
import {isTypedObject} from '../../utils/asserters'

export type SpanNode = {
  _type: string
  _key: string
  text?: string
  marks?: Array<string>
}

/**
 * Checks if a node is a span based on `_type` alone, without requiring `text`
 * to be present. This is needed to identify spans before normalization has had
 * a chance to add the missing `text` property.
 */
export function isSpanNode(
  context: {schema: EditorSchema},
  node: unknown,
): node is SpanNode {
  return isTypedObject(node) && node._type === context.schema.span.name
}
