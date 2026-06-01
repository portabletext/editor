/**
 * v1-compatible adapter on top of the v2 spike parser/serializer.
 *
 * Day 5: markdown-to-PT routes through the BlockSpec engine
 * (parseToBlockEvents → eventsToPortableText). pt-to-markdown
 * still delegates to v1's serializer; that swap is a separate
 * later pass.
 *
 * Lives only during the spike. Once v2 is feature-complete this
 * file is deleted.
 *
 * @internal
 */

import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import type {TypedObject} from '@portabletext/types'
import {portableTextToMarkdown as v1PortableTextToMarkdown} from '../from-portable-text/portable-text-to-markdown'
import {parseToBlockEvents} from './parse/block-parser'
import {eventsToPortableText} from './parse/events-to-portable-text'
import {extractLinkReferences} from './parse/link-references'
import {resolveOptions, type ParseOptions} from './parse/parser'

export function markdownToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  // Strip top-level link reference definitions and build a refs map.
  // The map is passed into the inline lexer (via resolveOptions) so
  // reference-style links \`[label][ref]\` resolve to href + title.
  const {markdown: stripped, refs} = extractLinkReferences(markdown)
  const events = parseToBlockEvents(stripped)
  const resolved = resolveOptions(options)
  resolved.linkReferences = refs
  return eventsToPortableText(events, resolved)
}

type V1Options = Parameters<typeof v1PortableTextToMarkdown>[1]

export function portableTextToMarkdown<Block extends TypedObject>(
  blocks: Array<Block>,
  options?: V1Options,
): string {
  return v1PortableTextToMarkdown(blocks, options)
}
