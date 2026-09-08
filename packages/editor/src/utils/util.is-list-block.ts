import {isTextBlock, type PortableTextListBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'

export function isListBlock(
  context: Pick<EditorContext, 'schema'>,
  block: unknown,
): block is PortableTextListBlock {
  return (
    isTextBlock(context, block) &&
    block.level !== undefined &&
    block.listItem !== undefined
  )
}
