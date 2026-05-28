import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {parseToPortableText} from './parse/parser'
import type {MarkdownV2Options} from './types'

/**
 * Convert markdown to Portable Text. Spike entry point.
 *
 * @internal
 */
export function markdownToPortableTextV2(
  markdown: string,
  options: MarkdownV2Options = {},
): Array<PortableTextBlock | PortableTextObject> {
  return parseToPortableText(markdown, {keyGenerator: options.keyGenerator})
}
