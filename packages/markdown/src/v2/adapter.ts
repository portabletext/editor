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
import {portableTextToMarkdown as v1PortableTextToMarkdown} from '../from-portable-text/portable-text-to-markdown'
import {parseToBlockEvents} from './parse/block-parser'
import {eventsToPortableText} from './parse/events-to-portable-text'
import {resolveOptions, type ParseOptions} from './parse/parser'

export function markdownToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  const events = parseToBlockEvents(markdown)
  return eventsToPortableText(events, resolveOptions(options))
}

export function portableTextToMarkdown(
  blocks: ReadonlyArray<PortableTextBlock | PortableTextObject>,
  options: Record<string, unknown> = {},
): string {
  return v1PortableTextToMarkdown(blocks as never, options as never)
}
