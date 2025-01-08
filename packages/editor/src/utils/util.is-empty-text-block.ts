import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from '@sanity/types'
import {getTextBlockText} from './util.get-text-block-text'

/**
 * @public
 */
export function isEmptyTextBlock(block: PortableTextBlock) {
  if (!isPortableTextTextBlock(block)) {
    return false
  }

  const onlyText = block.children.every(isPortableTextSpan)
  const blockText = getTextBlockText(block)

  return onlyText && blockText === ''
}
