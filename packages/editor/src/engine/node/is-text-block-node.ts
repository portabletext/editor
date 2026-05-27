import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {isTypedObject} from '../../utils/asserters'

type TextBlockNode = {
  _type: string
  _key: string
  children?: Array<PortableTextSpan | PortableTextObject>
  markDefs?: Array<PortableTextObject>
  style?: string
  listItem?: string
  level?: number
}

/**
 * Checks if a node is a text block based on `_type` alone, without requiring
 * `children` to be present. This is needed to identify text blocks before
 * normalization has had a chance to add the missing `children` property.
 */
export function isTextBlockNode(
  context: {schema: EditorSchema},
  node: unknown,
): node is TextBlockNode {
  return isTypedObject(node) && node._type === context.schema.block.name
}
