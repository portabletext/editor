import type {PortableTextTextBlock} from '@sanity/types'

/**
 * @public
 */
export function getTextBlockText(block: PortableTextTextBlock) {
  return block.children.map((child) => child.text ?? '').join('')
}
