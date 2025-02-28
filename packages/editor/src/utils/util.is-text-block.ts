import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import type {EditorContext} from '..'

/**
 * @public
 */
export function isTextBlock(
  context: Pick<EditorContext, 'schema'>,
  block: PortableTextBlock,
): block is PortableTextTextBlock {
  return block._type === context.schema.block.name
}
