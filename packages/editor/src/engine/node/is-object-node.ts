import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {isTypedObject} from '../../utils/asserters'

export function isObjectNode(
  context: {schema: EditorSchema},
  node: unknown,
): node is PortableTextObject {
  return (
    isTypedObject(node) &&
    node._type !== context.schema.block.name &&
    node._type !== context.schema.span.name
  )
}
