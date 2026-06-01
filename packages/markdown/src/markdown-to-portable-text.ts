import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {parseToBlockEvents} from './parse/block-parser'
import {eventsToPortableText} from './parse/events-to-portable-text'
import {extractLinkReferences} from './parse/link-references'
import {resolveOptions, type ParseOptions} from './parse/parser'

/**
 * Parse a markdown string into Portable Text.
 *
 * The parser is first-party: a block lexer + recursive-descent block parser
 * + inline parser, all emitting Portable Text directly. There is no
 * intermediate token tree.
 *
 * @public
 */
export function markdownToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  // Strip top-level link reference definitions and build a refs map. The
  // map is passed into the inline lexer (via resolveOptions) so reference-
  // style links like `[label][ref]` resolve to href + title.
  const {markdown: stripped, refs} = extractLinkReferences(markdown)
  const events = parseToBlockEvents(stripped)
  const resolved = resolveOptions(options)
  resolved.linkReferences = refs
  return eventsToPortableText(events, resolved)
}

export type {ParseOptions} from './parse/parser'
