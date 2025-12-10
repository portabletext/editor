import type {PortableTextTextBlock} from '@portabletext/schema'

/**
 * @public
 */
export function getTextBlockText(block: PortableTextTextBlock) {
  return block.children.map((child) => child.text ?? '').join('')
}
