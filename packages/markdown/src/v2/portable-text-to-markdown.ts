import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {serializeToMarkdown} from './print/serializer'

/**
 * Convert Portable Text to markdown. Spike entry point.
 *
 * @internal
 */
export function portableTextToMarkdownV2(
  blocks: ReadonlyArray<PortableTextBlock | PortableTextObject>,
): string {
  return serializeToMarkdown(blocks)
}
