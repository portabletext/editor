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
import {portableTextToMarkdown as v1PortableTextToMarkdown} from '../from-portable-text/portable-text-to-markdown'
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
  options: Record<string, unknown> = {},
): string {
  // When the consumer passes any renderer overrides, delegate to v1's
  // serializer which honors the full option surface (block, marks,
  // listItem, types, blockSpacing, hardBreak, unknown*). v2's own
  // serializer ships as the default-options path; one of the v2 spike
  // outcomes is replacing the v1 delegation with full v2 renderer
  // dispatch.
  const hasOverrides = Object.keys(options).length > 0
  if (hasOverrides) {
    return v1PortableTextToMarkdown(blocks as never, options as never)
  }
  return portableTextToMarkdownV2(blocks)
}
