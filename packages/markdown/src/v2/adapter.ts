/**
 * v1-compatible adapter on top of the v2 spike parser/serializer.
 *
 * Routes the v1 `markdownToPortableText` / `portableTextToMarkdown`
 * option shape through to the v2 internals. The corpus uses this so
 * existing tests can run with a single import-line swap.
 *
 * Lives only during the spike. Once v2 is feature-complete this file is
 * deleted and the entry points move to `markdown-to-portable-text.ts` /
 * `portable-text-to-markdown.ts`.
 *
 * @internal
 */

import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {parseToPortableText, type ParseOptions} from './parse/parser'
import {portableTextToMarkdownV2} from './portable-text-to-markdown'

export function markdownToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  return parseToPortableText(markdown, options)
}

export function portableTextToMarkdown(
  blocks: ReadonlyArray<PortableTextBlock | PortableTextObject>,
  _options: Record<string, unknown> = {},
): string {
  return portableTextToMarkdownV2(blocks)
}
