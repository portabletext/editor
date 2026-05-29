import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {parseToBlockEvents} from './parse/block-parser'
import {eventsToPortableText} from './parse/events-to-portable-text'
import {resolveOptions, type ParseOptions} from './parse/parser'
import type {MarkdownV2Options} from './types'

/**
 * Convert markdown to Portable Text. Spike entry point.
 *
 * Day 5: routed through the BlockSpec engine. The old parse/parser.ts
 * path is unused.
 *
 * @internal
 */
export function markdownToPortableTextV2(
  markdown: string,
  options: MarkdownV2Options & ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  const events = parseToBlockEvents(markdown)
  return eventsToPortableText(events, resolveOptions(options))
}
