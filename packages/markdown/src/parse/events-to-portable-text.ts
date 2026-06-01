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
import {makeInlineChildren, makeTextBlock, type ResolvedOptions} from './parser'

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
  const pendingListStack: Array<{
    list: PendingList
    item: PendingListItem | undefined
  }> = []
  const useListContainer = Boolean(options.types.list)
  const useBlockquoteContainer = Boolean(options.types.blockquote)

  // Buffer for blockquote inner blocks when types.blockquote is set.
  // Stack so nested blockquotes work.
  const blockquoteBuffers: Array<
    Array<PortableTextBlock | PortableTextObject>
  > = []

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
    if (!block) {
      return
    }
    const tb = block as PortableTextTextBlock
    const children = tb.children ?? []
    const nonSpan = children.filter(
      (c) => (c as {_type: string})._type !== 'span',
    )
    if (nonSpan.length === 0) {
      sinkOpen(block)
      return
    }
    const emptySpans = children.filter(
      (c) =>
        (c as {_type: string})._type === 'span' &&
        ((c as {text: string}).text ?? '') === '',
    )
    // Image-only paragraph: hoist the single non-span child.
    if (
      nonSpan.length === 1 &&
      nonSpan.length + emptySpans.length === children.length
    ) {
      sinkOpen(nonSpan[0] as PortableTextObject)
      return
    }
    // Mixed paragraph (text + inline objects): split only when the
    // schema lacks an inline image entry (the inline matcher returned
    // a value via the block-matcher fallback). When the schema has
    // inline image support, keep the children inline.
    const hasInlineImageObject = options.schema.inlineObjects.length > 0
    if (hasInlineImageObject) {
      sinkOpen(block)
      return
    }
    // SPLIT around the non-span children. Surrounding text spans
    // become their own blocks, the inline objects become standalone
    // blocks. Reuses the original block's _key for the first text
    // block, allocates new keys for subsequent splits.
    let currentRun: typeof children = []
    let firstSplit = true
    const emitRun = () => {
      if (currentRun.length === 0) {
        return
      }
      const nonEmpty = currentRun.some(
        (c) =>
          (c as {_type: string})._type === 'span' &&
          ((c as {text: string}).text ?? '') !== '',
      )
      if (!nonEmpty) {
        currentRun = []
        return
      }
      let blockKey: string
      let renumberedSpans: typeof currentRun
      if (firstSplit) {
        // First split keeps the original block + span keys.
        blockKey = tb._key
        renumberedSpans = currentRun
      } else {
        // Subsequent splits re-use the first span's _key as the new
        // block key and renumber the spans with fresh keys. This
        // preserves the keyGenerator's monotonic ordering (block
        // before span).
        const firstSpan = currentRun.find(
          (ch) => (ch as {_type: string})._type === 'span',
        ) as {_key: string} | undefined
        blockKey = firstSpan ? firstSpan._key : options.keyGenerator()
        let used = false
        renumberedSpans = currentRun.map((ch) => {
          if ((ch as {_type: string})._type === 'span') {
            if (!used) {
              used = true
              return {
                ...(ch as object),
                _key: options.keyGenerator(),
              } as typeof ch
            }
            return {
              ...(ch as object),
              _key: options.keyGenerator(),
            } as typeof ch
          }
          return ch
        })
      }
      firstSplit = false
      sinkOpen({
        _type: 'block',
        _key: blockKey,
        style: tb.style,
        children: [...renumberedSpans],
        markDefs: tb.markDefs ?? [],
      } as unknown as PortableTextBlock)
      currentRun = []
    }
    for (const ch of children) {
      const isObj = (ch as {_type: string})._type !== 'span'
      if (isObj) {
        emitRun()
        sinkOpen(ch as PortableTextObject)
      } else {
        currentRun.push(ch)
      }
    }
    emitRun()
  }

  let i = 0
  while (i < events.length) {
    const event = events[i]!

    if (event.kind === 'open') {
      if (event.spec === 'list') {
        const kind =
          (event.data?.['kind'] as 'bullet' | 'number' | 'task') ?? 'bullet'
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
            ...(pendingItem.checked !== undefined
              ? {checked: pendingItem.checked}
              : {}),
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
        const {text, line, nextIndex} = collectInline(
          events,
          i + 1,
          'paragraph',
        )
        // Callout detection: `> [!NOTE]` as the first \n-separated line
        // of an open blockquote's first paragraph. Paragraphs absorb soft
        // newlines so the marker may appear on line 1 of `text`.
        const calloutFirstLine = text.split('\n', 1)[0] ?? ''
        const alertMatch = calloutFirstLine.match(/^\[!([A-Z]+)\]\s*$/)
        const insideBlockquote =
          blockquoteDepth > 0 || blockquoteBuffers.length > 0
        if (alertMatch && insideBlockquote) {
          const tone = alertMatch[1]!.toLowerCase()
          const restOfFirst = text.split('\n').slice(1).join('\n')
          // Schema-probe before invoking the callout matcher (which
          // allocates a key on entry). When the schema lacks a
          // callout block-object, drop the [!XXX] marker line and
          // emit the remainder as a flat blockquote-styled paragraph
          // (matches v1 fallback).
          const hasCalloutSchema = options.schema.blockObjects.some(
            (b) => b.name === 'callout',
          )
          if (hasCalloutSchema && options.types.callout) {
            const calloutContent: Array<PortableTextBlock> = []
            if (restOfFirst.length > 0) {
              const ib = makeTextBlock('blockquote', restOfFirst, options, line)
              if (ib) {
                calloutContent.push(ib)
              }
            }
            let k = nextIndex
            while (k < events.length) {
              const ek = events[k]!
              if (ek.kind === 'close' && ek.spec === 'blockquote') {
                break
              }
              if (ek.kind === 'open' && ek.spec === 'paragraph') {
                const inner = collectInline(events, k + 1, 'paragraph')
                const ib = makeTextBlock(
                  'blockquote',
                  inner.text,
                  options,
                  inner.line,
                )
                if (ib) {
                  calloutContent.push(ib)
                }
                k = inner.nextIndex
                continue
              }
              // List inside the callout: recurse a sub-fold for just
              // the list events (preserves types.list container shape).
              if (ek.kind === 'open' && ek.spec === 'list') {
                let listEnd = k + 1
                let listDepth = 1
                while (listEnd < events.length) {
                  const ee = events[listEnd]!
                  if (ee.kind === 'open' && ee.spec === 'list') {
                    listDepth++
                  }
                  if (ee.kind === 'close' && ee.spec === 'list') {
                    listDepth--
                    if (listDepth === 0) {
                      break
                    }
                  }
                  listEnd++
                }
                const subListEvents = events.slice(k, listEnd + 1)
                const subListOut = eventsToPortableText(subListEvents, options)
                // Re-style inner text blocks (including those inside
                // list-item content) as 'blockquote' to match v1's
                // callout shape.
                const blockquoteStyleName = options.block.blockquote({
                  context: {schema: options.schema},
                })
                const restyle = (
                  b: PortableTextBlock | PortableTextObject,
                ): void => {
                  if (b._type === 'block') {
                    const tb = b as PortableTextTextBlock
                    if (tb.style === 'normal' && blockquoteStyleName) {
                      tb.style = blockquoteStyleName
                    }
                  }
                  // Recurse into list block-objects' items[].content[].
                  const list = b as {items?: Array<{content?: Array<unknown>}>}
                  if (list.items) {
                    for (const item of list.items) {
                      for (const inner of item.content ?? []) {
                        restyle(inner as PortableTextBlock | PortableTextObject)
                      }
                    }
                  }
                }
                for (const b of subListOut) {
                  restyle(b)
                  calloutContent.push(b as PortableTextBlock)
                }
                k = listEnd + 1
                continue
              }
              k++
            }
            const callout = options.types.callout({
              context: {
                schema: options.schema,
                keyGenerator: options.keyGenerator,
              },
              value: {tone, content: calloutContent},
              isInline: false,
            })
            if (callout) {
              if (insideBlockquote) {
                if (blockquoteBuffers.length > 0) {
                  blockquoteBuffers.pop()
                } else {
                  blockquoteDepth--
                }
              }
              sinkOpen(callout as PortableTextObject)
              i = k + 1
              continue
            }
          }
          // (closing of hasCalloutSchema branch above)
          // No callout schema: drop [!XXX], emit remainder as flat
          // blockquote-styled paragraph (or normal, if no blockquote
          // style is declared).
          if (restOfFirst.length > 0) {
            const blockquoteStyleName = options.block.blockquote({
              context: {schema: options.schema},
            })
            const styleKey = blockquoteStyleName ? 'blockquote' : 'normal'
            const block = makeTextBlock(styleKey, restOfFirst, options, line)
            if (block) {
              decorateListContext(
                block,
                listStack,
                pendingItem,
                useListContainer,
                options,
              )
              flushParagraphBlock(block)
            }
          }
          pendingItem = undefined
          i = nextIndex
          continue
        }
        // Image-only paragraph inside a list item: emit the image
        // directly without allocating a wasted block key (in-list v1
        // behavior doesn't waste the block key).
        const imageOnlyMatch = text
          .trim()
          .match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/)
        const inListItem = listStack.length > 0
        if (imageOnlyMatch && options.types.image && inListItem) {
          const [, alt, src, title] = imageOnlyMatch
          // v1 collapses image-only paragraphs into the surrounding
          // text block only when the schema has an inline image entry
          // but NO block image entry. With both, the image is emitted
          // standalone (block-level).
          const hasInlineImage = options.schema.inlineObjects.length > 0
          const hasBlockImage = options.schema.blockObjects.some(
            (b) => b.name === 'image',
          )
          const shouldMergeInline = hasInlineImage && !hasBlockImage
          // No matcher target at all → merge with v1's text-concat behavior.
          const shouldMergeText = !hasInlineImage && !hasBlockImage
          if (shouldMergeInline) {
            // Merge into previous text block in same list_item if
            // possible. The probe consumed no real keys (placeholder
            // generator), so the real call here is the first allocation.
            const lastEmitted = out[out.length - 1] as
              | {
                  _type: string
                  children?: unknown[]
                  listItem?: string
                  level?: number
                }
              | undefined
            const mergeable = lastEmitted && lastEmitted._type === 'block'
            const imageValue = options.types.image({
              context: {
                schema: options.schema,
                keyGenerator: options.keyGenerator,
              },
              value: {
                src: src ?? '',
                alt: alt ?? '',
                title: title || undefined,
              },
              isInline: true,
            }) as PortableTextObject
            if (mergeable) {
              ;(lastEmitted!.children as unknown[]).push(imageValue)
              let j = nextIndex
              while (j < events.length) {
                const ej = events[j]!
                if (ej.kind === 'close' && ej.spec === 'list_item') {
                  break
                }
                if (ej.kind === 'open' && ej.spec === 'paragraph') {
                  const sub = collectInline(events, j + 1, 'paragraph')
                  // Build the inline children WITHOUT allocating a
                  // surrounding block key (we're merging into the
                  // existing block).
                  const inlineChildren = makeInlineChildren(sub.text, options)
                  for (const ch of inlineChildren) {
                    ;(lastEmitted!.children as unknown[]).push(ch)
                  }
                  j = sub.nextIndex
                  continue
                }
                break
              }
              pendingItem = undefined
              i = j
              continue
            }
          }
          if (shouldMergeText) {
            // No image schema at all: concatenate the raw markdown
            // text into the previous block's span, then keep absorbing
            // subsequent paragraphs.
            const lastEmitted = out[out.length - 1] as
              | {
                  _type: string
                  children?: Array<{_type: string; text?: string}>
                  listItem?: string
                }
              | undefined
            if (
              lastEmitted &&
              lastEmitted._type === 'block' &&
              lastEmitted.listItem !== undefined &&
              lastEmitted.children &&
              lastEmitted.children.length > 0
            ) {
              const lastSpan =
                lastEmitted.children[lastEmitted.children.length - 1]!
              if (lastSpan._type === 'span') {
                const titlePart = title ? ` "${title}"` : ''
                lastSpan.text =
                  (lastSpan.text ?? '') +
                  `![${alt ?? ''}](${src ?? ''}${titlePart})`
              }
              let j = nextIndex
              while (j < events.length) {
                const ej = events[j]!
                if (ej.kind === 'close' && ej.spec === 'list_item') {
                  break
                }
                if (ej.kind === 'open' && ej.spec === 'paragraph') {
                  const sub = collectInline(events, j + 1, 'paragraph')
                  const last =
                    lastEmitted.children[lastEmitted.children.length - 1]!
                  if (last._type === 'span') {
                    last.text = (last.text ?? '') + sub.text
                  }
                  j = sub.nextIndex
                  continue
                }
                break
              }
              pendingItem = undefined
              i = j
              continue
            }
          }
          const lastEmitted = out[out.length - 1] as {_type: string} | undefined
          const previousWasBlockObject =
            lastEmitted && lastEmitted._type !== 'block'
          if (previousWasBlockObject) {
            options.keyGenerator()
          }
          const imageValue = options.types.image({
            context: {
              schema: options.schema,
              keyGenerator: options.keyGenerator,
            },
            value: {src: src ?? '', alt: alt ?? '', title: title || undefined},
            isInline: false,
          })
          if (imageValue) {
            sinkOpen(imageValue as PortableTextObject)
            pendingItem = undefined
            i = nextIndex
            continue
          }
        }

        const styleKey =
          blockquoteDepth > 0 && !useBlockquoteContainer
            ? 'blockquote'
            : 'normal'
        const block = makeTextBlock(styleKey, text, options, line)
        if (block) {
          decorateListContext(
            block,
            listStack,
            pendingItem,
            useListContainer,
            options,
          )
          flushParagraphBlock(block)
        }
        pendingItem = undefined
        i = nextIndex
        continue
      }
      if (event.spec === 'heading') {
        const level = (event.data?.['level'] as number) ?? 1
        const styleKey = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        const {text, line, nextIndex} = collectInline(events, i + 1, 'heading')
        const block =
          makeTextBlock(styleKey, text, options, line) ??
          makeTextBlock('normal', text, options, line)
        if (block) {
          decorateListContext(
            block,
            listStack,
            pendingItem,
            useListContainer,
            options,
          )
          sinkOpen(block)
        }
        pendingItem = undefined
        i = nextIndex
        continue
      }
      if (event.spec === 'fenced_code' || event.spec === 'code_block') {
        const lang =
          event.spec === 'fenced_code'
            ? (event.data?.['lang'] as string) || undefined
            : undefined
        const lines: string[] = []
        let j = i + 1
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'close' && e.spec === event.spec) {
            break
          }
          if (e.kind === 'verbatim_line') {
            lines.push(e.text)
          }
          j++
        }
        const code = lines.join('\n')
        const value = options.types.code({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {language: lang, code},
          isInline: false,
        })
        // Treat a matcher result without a non-empty string field
        // carrying the actual code content as "no matching schema"
        // — fall back to a flat text block. We can't know which schema
        // field is the code carrier, but the heuristic is: it must
        // exist, be a string, and equal (or contain) the source code.
        const isUseful =
          value &&
          Object.entries(value).some(
            ([k, v]) =>
              k !== '_key' &&
              k !== '_type' &&
              k !== 'language' &&
              typeof v === 'string' &&
              v.length > 0 &&
              v === code,
          )
        if (isUseful) {
          sinkOpen(value as PortableTextObject)
        } else {
          const block = makeTextBlock(
            'normal',
            code,
            options,
            event.location.line,
          )
          // Don't decorate the code-fallback block with listItem/level —
          // v1 treats the fallback as breaking out of list context.
          if (block) {
            sinkOpen(block)
          }
        }
        i = j + 1
        continue
      }
      if (event.spec === 'html_block') {
        const lines: string[] = []
        let j = i + 1
        while (j < events.length) {
          const e = events[j]!
          if (e.kind === 'close' && e.spec === 'html_block') {
            break
          }
          if (e.kind === 'verbatim_line') {
            lines.push(e.text)
          }
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
          // Fallback: emit the raw html as a single-span text block.
          // Skip the inline lexer (which strips inline HTML tags by
          // default) so the html content survives verbatim.
          const blockKey = options.keyGenerator()
          const spanKey = options.keyGenerator()
          sinkOpen({
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            children: [{_type: 'span', _key: spanKey, text: html, marks: []}],
            markDefs: [],
          } as unknown as PortableTextBlock)
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
            rows.push({
              raw: (e.data?.['raw'] as string) || '',
              line: e.location.line,
            })
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
          // No delimiter row → not a table. Per CommonMark these contiguous
          // `|`-prefixed lines are a single paragraph with the raw text
          // preserved (verbatim, including the leading `|`).
          const joined = rows.map((r) => r.raw).join('\n')
          const block = makeTextBlock('normal', joined, options, rows[0]?.line ?? 1)
          if (block) {
            sinkOpen(block)
          }
          i = j
          continue
        }
        const bodyRows = rows.slice(2).map((r) => parseRowCells(r.raw))
        const matcher = options.types.table
        if (!matcher) {
          // Build the full row/cell structure to allocate the same keys
          // v1 allocates, then dump cells as paragraphs (the cell and
          // row keys go unused but the keyGenerator advances).
          const emitRow = (cellTexts: string[]) => {
            const cellOuts: Array<{block: PortableTextBlock | undefined}> = []
            for (const cellText of cellTexts) {
              const block = makeTextBlock(
                'normal',
                cellText,
                options,
                rows[0]?.line ?? 1,
              )
              options.keyGenerator() // wasted cell key (v1 builds {_type:'cell',_key,value})
              cellOuts.push({block})
            }
            options.keyGenerator() // wasted row key
            for (const c of cellOuts) {
              if (c.block) {
                sinkOpen(c.block)
              }
            }
          }
          emitRow(headerCells)
          for (const bc of bodyRows) {
            emitRow(bc)
          }
          // wasted table key
          options.keyGenerator()
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
          const block = makeTextBlock(
            'normal',
            text,
            options,
            rows[0]?.line ?? 1,
          )
          if (!block) {
            return []
          }
          const childs = (block.children ?? []) as Array<{
            _type: string
            text?: string
          }>
          const nonSpan = childs.filter((c) => c._type !== 'span')
          const emptySpans = childs.filter(
            (c) => c._type === 'span' && (c.text ?? '') === '',
          )
          if (
            nonSpan.length === 1 &&
            nonSpan.length + emptySpans.length === childs.length
          ) {
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
          value: {
            headerRows: 1,
            rows: rowsBuilt as Parameters<typeof matcher>[0]['value']['rows'],
          },
          isInline: false,
        })
        if (tableValue) {
          sinkOpen(tableValue as PortableTextObject)
        }
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
          const block = makeTextBlock(
            'normal',
            '---',
            options,
            event.location.line,
          )
          if (block) {
            sinkOpen(block)
          }
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
              context: {
                schema: options.schema,
                keyGenerator: options.keyGenerator,
              },
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
                    ;(
                      tb as PortableTextTextBlock & {listItem?: string}
                    ).listItem =
                      closing.list.kind === 'task'
                        ? 'bullet'
                        : closing.list.kind
                    ;(tb as PortableTextTextBlock & {level?: number}).level = 1
                    if (
                      closing.list.kind === 'task' &&
                      item.checked !== undefined
                    ) {
                      ;(
                        tb as PortableTextTextBlock & {checked?: boolean}
                      ).checked = item.checked
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
            context: {
              schema: options.schema,
              keyGenerator: options.keyGenerator,
            },
            value: {content: inner as Array<PortableTextBlock>},
            isInline: false,
          })
          if (value) {
            sinkOpen(value as PortableTextObject)
          } else {
            // Matcher returned undefined: fall back to flat blockquote-
            // styled blocks (re-style normal-styled children).
            for (const b of inner) {
              if (b._type === 'block') {
                const tb = b as PortableTextTextBlock
                if (!tb.listItem && tb.style === 'normal') {
                  const restyled = options.block.blockquote({
                    context: {schema: options.schema},
                  })
                  if (restyled) {
                    tb.style = restyled
                  }
                }
              }
              sinkOpen(b)
            }
          }
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
  if (listStack.length === 0) {
    return
  }
  if (useListContainer) {
    return
  }
  const innermost = listStack[listStack.length - 1]!
  let listItemName = options.listItem[innermost.kind]({
    context: {schema: options.schema},
  })
  // Task falls back to bullet when no task definition exists.
  if (!listItemName && innermost.kind === 'task') {
    listItemName = options.listItem.bullet({context: {schema: options.schema}})
  }
  if (!listItemName) {
    return
  }
  ;(
    block as PortableTextTextBlock & {
      listItem?: string
      level?: number
      checked?: boolean
    }
  ).listItem = listItemName
  ;(block as PortableTextTextBlock & {level?: number}).level = innermost.level
  if (innermost.kind === 'task' && pendingItem?.checked !== undefined) {
    // Only emit checked when a task list item is actually declared in the schema.
    const taskName = options.listItem.task({context: {schema: options.schema}})
    if (taskName) {
      ;(block as PortableTextTextBlock & {checked?: boolean}).checked =
        pendingItem.checked
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
      if (buffer.length === 0) {
        line = e.location.line
      }
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
    if (e.kind === 'close' && e.spec === spec) {
      return i
    }
    i++
  }
  return events.length
}
