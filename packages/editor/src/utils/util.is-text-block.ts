import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorContext} from '..'
import {isTypedObject} from '../internal-utils/asserters'

/**
 * @public
 */
export function isTextBlock(
  context: Pick<EditorContext, 'schema'>,
  block: unknown,
): block is PortableTextTextBlock {
  return isTypedObject(block) && block._type === context.schema.block.name
}
