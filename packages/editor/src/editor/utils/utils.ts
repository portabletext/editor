import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@sanity/types'

export function isEmptyTextBlock(block: PortableTextBlock) {
  if (!isPortableTextTextBlock(block)) {
    return false
  }

  const onlyText = block.children.every(isPortableTextSpan)
  const blockText = getTextBlockText(block)

  return onlyText && blockText === ''
}

export function getTextBlockText(block: PortableTextTextBlock) {
  return block.children.map((child) => child.text ?? '').join('')
}
