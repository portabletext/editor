/**
 * Fold a `BlockEvent[]` stream into Portable Text.
 *
 * Reuses the existing matcher pipeline (`makeTextBlock` for inline
 * runs, `buildObjectMatcher` for block objects). Each block kind has
 * a handler that consumes its open/close window plus any inline_run /
 * verbatim_line events in between.
 *
 * Day 1: paragraph, heading, thematic_break.
 * Day 2: blockquote (flat `style: blockquote`), list, list_item
 *        (flat `listItem`/`level`/`checked`).
 *
 * See /specs/portabletext-markdown-v2-lazy-continuation.md §3.3.
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {BlockEvent} from './events'
import {
  makeTextBlock,
  type ResolvedOptions,
} from './parser'

interface ListContext {
  kind: 'bullet' | 'number' | 'task'
  level: number
}

export function eventsToPortableText(
  events: BlockEvent[],
  options: ResolvedOptions,
): Array<PortableTextBlock | PortableTextObject> {
  const out: Array<PortableTextBlock | PortableTextObject> = []
  const listStack: ListContext[] = []
  let blockquoteDepth = 0
  let pendingItem: {marker: string; checked?: boolean} | undefined

  let i = 0
  while (i < events.length) {
    const event = events[i]!

    if (event.kind === 'open') {
      if (event.spec === 'list') {
        const kind = (event.data?.['kind'] as 'bullet' | 'number' | 'task') ?? 'bullet'
        listStack.push({kind, level: listStack.length + 1})
        i++
        continue
      }
      if (event.spec === 'list_item') {
        pendingItem = {
          marker: event.data?.['marker'] as string,
          checked: event.data?.['checked'] as boolean | undefined,
        }
        i++
        continue
      }
      if (event.spec === 'blockquote') {
        blockquoteDepth++
        i++
        continue
      }
      if (event.spec === 'paragraph') {
        const {text, line, nextIndex} = collectInline(events, i + 1, 'paragraph')
        const styleKey = blockquoteDepth > 0 ? 'blockquote' : 'normal'
        const block = makeTextBlock(styleKey, text, options, line)
        if (block) {
          decorateListContext(block, listStack, pendingItem)
          out.push(block)
        }
        pendingItem = undefined  // first content block of an item consumes the marker
        i = nextIndex
        continue
      }
      if (event.spec === 'heading') {
        const level = (event.data?.['level'] as number) ?? 1
        const styleKey = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        const {text, line, nextIndex} = collectInline(events, i + 1, 'heading')
        const block =
          makeTextBlock(styleKey, text, options, line) ??
          makeTextBlock('normal', text, options, line)
        if (block) {
          decorateListContext(block, listStack, pendingItem)
          out.push(block)
        }
        pendingItem = undefined
        i = nextIndex
        continue
      }
      if (event.spec === 'fenced_code' || event.spec === 'code_block') {
        const lang = event.spec === 'fenced_code' ? ((event.data?.['lang'] as string) || undefined) : undefined
        const lines: string[] = []
        let j = i + 1
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'close' && e.spec === event.spec) break
          if (e.kind === 'verbatim_line') lines.push(e.text)
          j++
        }
        const code = lines.join('\n')
        const value = options.types.code({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {language: lang, code},
          isInline: false,
        })
        if (value) {
          out.push(value as PortableTextObject)
        } else {
          const block = makeTextBlock('normal', code, options, event.location.line)
          if (block) out.push(block)
        }
        i = j + 1
        continue
      }
      if (event.spec === 'html_block') {
        const lines: string[] = []
        let j = i + 1
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'close' && e.spec === 'html_block') break
          if (e.kind === 'verbatim_line') lines.push(e.text)
          j++
        }
        const html = lines.join('\n')
        const value = options.types.html?.({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {html},
          isInline: false,
        })
        if (value) {
          out.push(value as PortableTextObject)
        } else {
          const block = makeTextBlock('normal', html, options, event.location.line)
          if (block) out.push(block)
        }
        i = j + 1
        continue
      }
      if (event.spec === 'table_row') {
        // Collect contiguous table_row events; commit as table if the
        // second row is a delimiter; else emit each cell as a paragraph
        // (fallback) or pass through as plain text.
        const rows: Array<{raw: string; line: number}> = []
        let j = i
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'open' && e.spec === 'table_row') {
            rows.push({raw: (e.data?.['raw'] as string) || '', line: e.location.line})
          } else if (e.kind === 'close' && e.spec === 'table_row') {
            // ok
          } else if (!(e.kind === 'inline_run')) {
            break
          }
          // Continue scanning for more table_rows.
          if (e.kind === 'close' && e.spec === 'table_row') {
            // Peek for next event: is it another open table_row?
            const next = events[j + 1]
            if (!next || next.kind !== 'open' || next.spec !== 'table_row') {
              j++
              break
            }
          }
          j++
        }
        // Parse cells: split on `|` excluding outer pipes.
        const parseRowCells = (raw: string): string[] => {
          const trimmed = raw.trim().replace(/^\|/, '').replace(/\|$/, '')
          return trimmed.split('|').map(s => s.trim())
        }
        const headerCells = parseRowCells(rows[0]?.raw ?? '')
        // Delimiter detection.
        const delimiterRow = rows[1]?.raw
        const isDelimiterRow = delimiterRow && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(delimiterRow)
        if (!isDelimiterRow) {
          // Not a table: emit each header cell + body row cell as a paragraph.
          const allRowCells = rows.map(r => parseRowCells(r.raw))
          for (const rowCells of allRowCells) {
            for (const cell of rowCells) {
              const cellBlock = makeTextBlock('normal', cell, options, rows[0]?.line ?? 1)
              if (cellBlock) out.push(cellBlock)
            }
          }
          i = j
          continue
        }
        const bodyRows = rows.slice(2).map(r => parseRowCells(r.raw))
        const matcher = options.types.table
        if (!matcher) {
          const allRowCells = [headerCells, ...bodyRows]
          for (const rowCells of allRowCells) {
            for (const cell of rowCells) {
              const cellBlock = makeTextBlock('normal', cell, options, rows[0]?.line ?? 1)
              if (cellBlock) out.push(cellBlock)
            }
          }
          i = j
          continue
        }
        const buildCellBlocks = (text: string) => {
          const block = makeTextBlock('normal', text, options, rows[0]?.line ?? 1)
          return block ? [block] : []
        }
        const cells = (texts: string[]) =>
          texts.map(t => ({
            _type: 'cell',
            _key: options.keyGenerator(),
            value: buildCellBlocks(t),
          }))
        const tableValue = matcher({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {
            headerRows: 1,
            rows: [
              {_type: 'row', _key: options.keyGenerator(), cells: cells(headerCells)},
              ...bodyRows.map((bc) => ({
                _type: 'row',
                _key: options.keyGenerator(),
                cells: cells(bc),
              })),
            ],
          },
          isInline: false,
        })
        if (tableValue) out.push(tableValue as PortableTextObject)
        i = j
        continue
      }
      if (event.spec === 'thematic_break') {
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
        i = findClose(events, i + 1, 'thematic_break') + 1
        continue
      }
    }

    if (event.kind === 'close') {
      if (event.spec === 'list') {
        listStack.pop()
      } else if (event.spec === 'blockquote') {
        blockquoteDepth--
      } else if (event.spec === 'list_item') {
        pendingItem = undefined
      }
      i++
      continue
    }

    i++
  }
  return out
}

function decorateListContext(
  block: PortableTextTextBlock,
  listStack: ListContext[],
  pendingItem: {marker: string; checked?: boolean} | undefined,
): void {
  if (listStack.length === 0) return
  const innermost = listStack[listStack.length - 1]!
  ;(block as PortableTextTextBlock & {listItem?: string; level?: number; checked?: boolean}).listItem =
    innermost.kind === 'task' ? 'bullet' : innermost.kind
  ;(block as PortableTextTextBlock & {listItem?: string; level?: number}).level = innermost.level
  if (innermost.kind === 'task' && pendingItem?.checked !== undefined) {
    ;(block as PortableTextTextBlock & {checked?: boolean}).checked = pendingItem.checked
  }
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
