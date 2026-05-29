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
 * Day 4: tables.
 * Day 6: matcher clusters — types.list container, types.blockquote
 *        container, types.callout, image hoist in paragraph flush.
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

interface PendingListItem {
  _key: string
  _type: 'list-item'
  checked?: boolean
  content: Array<PortableTextBlock | PortableTextObject>
}

interface PendingList {
  kind: 'bullet' | 'number' | 'task'
  items: Array<PendingListItem>
}

export function eventsToPortableText(
  events: BlockEvent[],
  options: ResolvedOptions,
): Array<PortableTextBlock | PortableTextObject> {
  const out: Array<PortableTextBlock | PortableTextObject> = []
  const listStack: ListContext[] = []
  let blockquoteDepth = 0
  let pendingItem: {marker: string; checked?: boolean} | undefined

  // types.list container path: when the matcher is registered we buffer
  // every nesting level of lists. Stacks parallel listStack so nested
  // lists become nested list block-objects.
  const pendingListStack: Array<{list: PendingList; item: PendingListItem | undefined}> = []
  const useListContainer = Boolean(options.types.list)
  const useBlockquoteContainer = Boolean(options.types.blockquote)

  // Buffer for blockquote inner blocks when types.blockquote is set.
  // Stack so nested blockquotes work.
  const blockquoteBuffers: Array<Array<PortableTextBlock | PortableTextObject>> = []

  const sinkOpen = (b: PortableTextBlock | PortableTextObject): void => {
    const topPending = pendingListStack[pendingListStack.length - 1]
    if (topPending?.item) {
      topPending.item.content.push(b)
      return
    }
    if (blockquoteBuffers.length > 0) {
      blockquoteBuffers[blockquoteBuffers.length - 1]!.push(b)
      return
    }
    out.push(b)
  }

  const flushParagraphBlock = (block: PortableTextBlock | undefined): void => {
    if (!block) return
    const tb = block as PortableTextTextBlock
    // Image hoist: paragraph containing exactly one non-span child (an
    // inline image converted to a block-object) is hoisted as a block.
    const children = tb.children ?? []
    const nonSpan = children.filter((c) => (c as {_type: string})._type !== 'span')
    const emptySpans = children.filter(
      (c) =>
        (c as {_type: string})._type === 'span' &&
        (((c as {text: string}).text ?? '') === ''),
    )
    if (nonSpan.length === 1 && nonSpan.length + emptySpans.length === children.length) {
      sinkOpen(nonSpan[0] as PortableTextObject)
      return
    }
    sinkOpen(block)
  }

  let i = 0
  while (i < events.length) {
    const event = events[i]!

    if (event.kind === 'open') {
      if (event.spec === 'list') {
        const kind = (event.data?.['kind'] as 'bullet' | 'number' | 'task') ?? 'bullet'
        if (useListContainer) {
          pendingListStack.push({list: {kind, items: []}, item: undefined})
        }
        listStack.push({kind, level: listStack.length + 1})
        i++
        continue
      }
      if (event.spec === 'list_item') {
        pendingItem = {
          marker: event.data?.['marker'] as string,
          checked: event.data?.['checked'] as boolean | undefined,
        }
        const topFrame = pendingListStack[pendingListStack.length - 1]
        if (useListContainer && topFrame) {
          topFrame.item = {
            _key: options.keyGenerator(),
            _type: 'list-item',
            ...(pendingItem.checked !== undefined ? {checked: pendingItem.checked} : {}),
            content: [],
          }
        }
        i++
        continue
      }
      if (event.spec === 'blockquote') {
        if (useBlockquoteContainer) {
          blockquoteBuffers.push([])
        } else {
          blockquoteDepth++
        }
        i++
        continue
      }
      if (event.spec === 'paragraph') {
        const {text, line, nextIndex} = collectInline(events, i + 1, 'paragraph')
        // Callout detection: `> [!NOTE]` as the first \n-separated line
        // of an open blockquote's first paragraph. Paragraphs absorb soft
        // newlines so the marker may appear on line 1 of `text`.
        const calloutFirstLine = text.split('\n', 1)[0] ?? ''
        const alertMatch = calloutFirstLine.match(/^\[!([A-Z]+)\]\s*$/)
        if (alertMatch && blockquoteDepth > 0 && options.types.callout) {
          const tone = alertMatch[1]!.toLowerCase()
          const calloutContent: Array<PortableTextBlock> = []
          // Drop the [!XXX] line and add the rest of the same paragraph
          // as the first content block.
          const restOfFirst = text.split('\n').slice(1).join('\n')
          if (restOfFirst.length > 0) {
            const ib = makeTextBlock('blockquote', restOfFirst, options, line)
            if (ib) calloutContent.push(ib)
          }
          let k = nextIndex
          while (k < events.length) {
            const ek = events[k]!
            if (ek.kind === 'close' && ek.spec === 'blockquote') break
            if (ek.kind === 'open' && ek.spec === 'paragraph') {
              const inner = collectInline(events, k + 1, 'paragraph')
              const ib = makeTextBlock('blockquote', inner.text, options, inner.line)
              if (ib) calloutContent.push(ib)
              k = inner.nextIndex
              continue
            }
            k++
          }
          const callout = options.types.callout({
            context: {schema: options.schema, keyGenerator: options.keyGenerator},
            value: {tone, content: calloutContent},
            isInline: false,
          })
          if (callout) {
            blockquoteDepth--  // skip the blockquote close
            sinkOpen(callout as PortableTextObject)
            i = k + 1  // past blockquote close
            continue
          }
        }
        const styleKey = blockquoteDepth > 0 && !useBlockquoteContainer ? 'blockquote' : 'normal'
        const block = makeTextBlock(styleKey, text, options, line)
        if (block) {
          decorateListContext(block, listStack, pendingItem, useListContainer, options)
          flushParagraphBlock(block)
        }
        pendingItem = undefined
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
          decorateListContext(block, listStack, pendingItem, useListContainer, options)
          sinkOpen(block)
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
          sinkOpen(value as PortableTextObject)
        } else {
          const block = makeTextBlock('normal', code, options, event.location.line)
          if (block) sinkOpen(block)
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
          sinkOpen(value as PortableTextObject)
        } else {
          const block = makeTextBlock('normal', html, options, event.location.line)
          if (block) sinkOpen(block)
        }
        i = j + 1
        continue
      }
      if (event.spec === 'table_row') {
        const rows: Array<{raw: string; line: number}> = []
        let j = i
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'open' && e.spec === 'table_row') {
            rows.push({raw: (e.data?.['raw'] as string) || '', line: e.location.line})
          } else if (e.kind === 'close' && e.spec === 'table_row') {
            const next = events[j + 1]
            if (!next || next.kind !== 'open' || next.spec !== 'table_row') {
              j++
              break
            }
          } else if (e.kind !== 'inline_run') {
            break
          }
          j++
        }
        const parseRowCells = (raw: string): string[] => {
          const trimmed = raw.trim().replace(/^\|/, '').replace(/\|$/, '')
          return trimmed.split('|').map((s) => s.trim())
        }
        const headerCells = parseRowCells(rows[0]?.raw ?? '')
        const delimiterRow = rows[1]?.raw
        const isDelimiterRow =
          delimiterRow &&
          /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(delimiterRow)
        if (!isDelimiterRow) {
          for (const row of rows) {
            for (const cell of parseRowCells(row.raw)) {
              const cellBlock = makeTextBlock('normal', cell, options, row.line)
              if (cellBlock) sinkOpen(cellBlock)
            }
          }
          i = j
          continue
        }
        const bodyRows = rows.slice(2).map((r) => parseRowCells(r.raw))
        const matcher = options.types.table
        if (!matcher) {
          for (const rowCells of [headerCells, ...bodyRows]) {
            for (const cell of rowCells) {
              const cellBlock = makeTextBlock('normal', cell, options, rows[0]?.line ?? 1)
              if (cellBlock) sinkOpen(cellBlock)
            }
          }
          i = j
          continue
        }
        // Allocate keys deep-first: cell content → cell key → row key.
        // (Matches v1 to keep corpus key-order stable.)
        // Cell-content image hoist: a cell whose paragraph contains
        // exactly one non-span child (an inline image upgraded to a
        // block-object) emits the bare image without the wrapping
        // text block.
        const buildCellValue = (text: string) => {
          const block = makeTextBlock('normal', text, options, rows[0]?.line ?? 1)
          if (!block) return []
          const childs = (block.children ?? []) as Array<{_type: string; text?: string}>
          const nonSpan = childs.filter((c) => c._type !== 'span')
          const emptySpans = childs.filter(
            (c) => c._type === 'span' && ((c.text ?? '') === ''),
          )
          if (nonSpan.length === 1 && nonSpan.length + emptySpans.length === childs.length) {
            return [nonSpan[0] as PortableTextObject]
          }
          return [block]
        }
        const buildCell = (text: string) => {
          const value = buildCellValue(text)
          const cellKey = options.keyGenerator()
          return {
            _type: 'cell',
            _key: cellKey,
            value,
          }
        }
        const buildRow = (cellTexts: string[]) => {
          const cellObjs = cellTexts.map(buildCell)
          return {
            _type: 'row',
            _key: options.keyGenerator(),
            cells: cellObjs,
          }
        }
        const rowsBuilt = [headerCells, ...bodyRows].map(buildRow)
        const tableValue = matcher({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {headerRows: 1, rows: rowsBuilt},
          isInline: false,
        })
        if (tableValue) sinkOpen(tableValue as PortableTextObject)
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
          sinkOpen(value as PortableTextObject)
        } else {
          const block = makeTextBlock('normal', '---', options, event.location.line)
          if (block) sinkOpen(block)
        }
        i = findClose(events, i + 1, 'thematic_break') + 1
        continue
      }
    }

    if (event.kind === 'close') {
      if (event.spec === 'list') {
        listStack.pop()
        if (useListContainer) {
          const closing = pendingListStack.pop()
          if (closing) {
            const value = options.types.list!({
              context: {schema: options.schema, keyGenerator: options.keyGenerator},
              value: {kind: closing.list.kind, items: closing.list.items},
              isInline: false,
            })
            const sink = (b: PortableTextBlock | PortableTextObject) => {
              const parentFrame = pendingListStack[pendingListStack.length - 1]
              if (parentFrame?.item) {
                parentFrame.item.content.push(b)
              } else if (blockquoteBuffers.length > 0) {
                blockquoteBuffers[blockquoteBuffers.length - 1]!.push(b)
              } else {
                out.push(b)
              }
            }
            if (value) {
              sink(value)
            } else {
              // Matcher returned undefined: fall back to flat blocks.
              for (const item of closing.list.items) {
                for (const b of item.content) {
                  if (b._type === 'block') {
                    const tb = b as PortableTextTextBlock
                    ;(tb as PortableTextTextBlock & {listItem?: string}).listItem =
                      closing.list.kind === 'task' ? 'bullet' : closing.list.kind
                    ;(tb as PortableTextTextBlock & {level?: number}).level = 1
                    if (closing.list.kind === 'task' && item.checked !== undefined) {
                      ;(tb as PortableTextTextBlock & {checked?: boolean}).checked = item.checked
                    }
                  }
                  sink(b)
                }
              }
            }
          }
        }
      } else if (event.spec === 'blockquote') {
        if (useBlockquoteContainer) {
          const inner = blockquoteBuffers.pop() ?? []
          const value = options.types.blockquote!({
            context: {schema: options.schema, keyGenerator: options.keyGenerator},
            value: {content: inner as Array<PortableTextBlock>},
            isInline: false,
          })
          if (value) sinkOpen(value as PortableTextObject)
        } else {
          blockquoteDepth--
        }
      } else if (event.spec === 'list_item') {
        const topFrame = pendingListStack[pendingListStack.length - 1]
        if (useListContainer && topFrame?.item) {
          topFrame.list.items.push(topFrame.item)
          topFrame.item = undefined
        }
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
  useListContainer: boolean,
  options: ResolvedOptions,
): void {
  if (listStack.length === 0) return
  if (useListContainer) return
  const innermost = listStack[listStack.length - 1]!
  let listItemName = options.listItem[innermost.kind]({
    context: {schema: options.schema},
  })
  // Task falls back to bullet when no task definition exists.
  if (!listItemName && innermost.kind === 'task') {
    listItemName = options.listItem.bullet({context: {schema: options.schema}})
  }
  if (!listItemName) return
  ;(block as PortableTextTextBlock & {listItem?: string; level?: number; checked?: boolean}).listItem = listItemName
  ;(block as PortableTextTextBlock & {level?: number}).level = innermost.level
  if (innermost.kind === 'task' && pendingItem?.checked !== undefined) {
    // Only emit checked when a task list item is actually declared in the schema.
    const taskName = options.listItem.task({context: {schema: options.schema}})
    if (taskName) {
      ;(block as PortableTextTextBlock & {checked?: boolean}).checked = pendingItem.checked
    }
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
