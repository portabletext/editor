/**
 * Fold a `BlockEvent[]` stream into Portable Text.
 *
 * Reuses the existing matcher pipeline (`makeTextBlock` for inline
 * runs, `buildObjectMatcher` for block objects). Each block kind
 * (`paragraph`, `heading`, `thematic_break`, `blockquote`, `list`,
 * `list_item`, `code_block`, `fenced_code`, `html_block`, `table_row`,
 * `callout`) has a handler that consumes its open/close window plus
 * any inline_run / verbatim_line events in between.
 *
 * Day 1 scope: paragraph, heading, thematic_break.
 *
 * See /specs/portabletext-markdown-v2-lazy-continuation.md §3.3.
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
} from '@portabletext/schema'
import type {BlockEvent} from './events'
import {
  makeTextBlock,
  type ResolvedOptions,
} from './parser'

export function eventsToPortableText(
  events: BlockEvent[],
  options: ResolvedOptions,
): Array<PortableTextBlock | PortableTextObject> {
  const out: Array<PortableTextBlock | PortableTextObject> = []
  let i = 0
  while (i < events.length) {
    const event = events[i]!
    if (event.kind !== 'open') {
      i++
      continue
    }
    const kind = event.spec
    if (kind === 'paragraph') {
      const {text, line, nextIndex} = collectInline(events, i + 1, 'paragraph')
      const block = makeTextBlock('normal', text, options, line)
      if (block) out.push(block)
      i = nextIndex
      continue
    }
    if (kind === 'heading') {
      const level = (event.data?.['level'] as number) ?? 1
      const styleKey = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const {text, line, nextIndex} = collectInline(events, i + 1, 'heading')
      // Try the heading style first; if matcher returns undefined, fall back
      // to 'normal' so the text content survives.
      const block =
        makeTextBlock(styleKey, text, options, line) ??
        makeTextBlock('normal', text, options, line)
      if (block) out.push(block)
      i = nextIndex
      continue
    }
    if (kind === 'thematic_break') {
      const value = options.types.horizontalRule({
        context: {schema: options.schema, keyGenerator: options.keyGenerator},
        value: {},
        isInline: false,
      })
      if (value) {
        out.push(value as PortableTextObject)
      } else {
        const block = makeTextBlock('normal', '---', options, event.location.line)
        if (block) out.push(block)
      }
      // Advance past the close event.
      i = findClose(events, i + 1, 'thematic_break') + 1
      continue
    }
    i++
  }
  return out
}

function collectInline(
  events: BlockEvent[],
  start: number,
  spec: string,
): {text: string; line: number; nextIndex: number} {
  let line = 1
  const buffer: string[] = []
  let i = start
  while (i < events.length) {
    const e = events[i]!
    if (e.kind === 'close' && e.spec === spec) {
      return {text: buffer.join('\n'), line, nextIndex: i + 1}
    }
    if (e.kind === 'inline_run') {
      if (buffer.length === 0) line = e.location.line
      buffer.push(e.text)
    }
    i++
  }
  return {text: buffer.join('\n'), line, nextIndex: i}
}

function findClose(events: BlockEvent[], start: number, spec: string): number {
  let i = start
  while (i < events.length) {
    const e = events[i]!
    if (e.kind === 'close' && e.spec === spec) return i
    i++
  }
  return events.length
}
