/**
 * v1-compatible adapter on top of the v2 spike parser/serializer.
 *
 * markdown-to-PT routes through v2's parser. PT-to-markdown delegates
 * to v1's serializer for now — replacing v1's renderer dispatch with
 * v2's own per-node print functions is queued for the next pass.
 *
 * Lives only during the spike. Once v2 is feature-complete this file
 * is deleted and the entry points move to `markdown-to-portable-text.ts`
 * / `portable-text-to-markdown.ts`.
 *
 * @internal
 */

import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {portableTextToMarkdown as v1PortableTextToMarkdown} from '../from-portable-text/portable-text-to-markdown'
import {parseToPortableText, type ParseOptions} from './parse/parser'

export function markdownToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  return parseToPortableText(markdown, options)
}

export function portableTextToMarkdown(
  blocks: ReadonlyArray<PortableTextBlock | PortableTextObject>,
  options: Record<string, unknown> = {},
): string {
  return v1PortableTextToMarkdown(blocks as never, options as never)
}
