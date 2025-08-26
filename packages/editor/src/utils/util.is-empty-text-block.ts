import {isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {getTextBlockText} from './util.get-text-block-text'

/**
 * @public
 */
export function isEmptyTextBlock(
  context: Pick<EditorContext, 'schema'>,
  block: PortableTextBlock,
) {
  if (!isTextBlock(context, block)) {
    return false
  }

  const onlyText = block.children.every((child) => isSpan(context, child))
  const blockText = getTextBlockText(block)

  return onlyText && blockText === ''
}
