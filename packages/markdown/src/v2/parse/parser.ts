/**
 * Parser for `@portabletext/markdown` v2 (spike).
 *
 * Consumes block tokens from `BlockLexer` and inline tokens from
 * `lexInline`, emitting Portable Text blocks directly. There is no
 * intermediate AST.
 *
 * Spike scope: paragraph, heading h1-h6, fenced code, thematic break,
 * blockquote (flat path with `style: 'blockquote'`), bullet/ordered list
 * (flat path with `listItem` + `level`). Inline: strong/em/code/link/
 * autolink/hardbreak. See /specs/portabletext-markdown-v2.md §8.1.
 *
 * The parser is matcher-aware: every node consults the corresponding
 * matcher option (`block.normal`, `block.h1`, `marks.strong`, …) to learn
 * what `style` / `listItem` / decorator / annotation `_type` to emit.
 * Matchers returning `undefined` cause the node to fall back to plain
 * text (heading semantics dropped, decorator dropped, list-item dropped).
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {
  blockquoteStyleDefinition,
  defaultCalloutObjectDefinition,
  defaultCodeDecoratorDefinition,
  defaultEmDecoratorDefinition,
  defaultHorizontalRuleObjectDefinition,
  defaultHtmlObjectDefinition,
  defaultImageObjectDefinition,
  defaultLinkObjectDefinition,
  defaultOrderedListItemDefinition,
  defaultSchema,
  defaultStrikeThroughDecoratorDefinition,
  defaultStrongDecoratorDefinition,
  defaultTaskListItemDefinition,
  defaultUnorderedListItemDefinition,
  defaultCodeObjectDefinition,
  h1StyleDefinition,
  h2StyleDefinition,
  h3StyleDefinition,
  h4StyleDefinition,
  h5StyleDefinition,
  h6StyleDefinition,
  normalStyleDefinition,
} from '../../default-schema'
import {defaultKeyGenerator} from '../../key-generator'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildObjectMatcher,
  buildStyleMatcher,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ListItemMatcher,
  type ObjectMatcher,
  type StyleMatcher,
} from '../../to-portable-text/matchers'
import {InlineTokenType, lexInline, type InlineToken} from './inline-lexer'
import {BlockLexer, BlockTokenType} from './lexer'

export interface ParseOptions {
  schema?: Schema
  keyGenerator?: () => string
  marks?: {
    strong?: DecoratorMatcher
    em?: DecoratorMatcher
    code?: DecoratorMatcher
    strikeThrough?: DecoratorMatcher
    link?: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block?: {
    normal?: StyleMatcher
    blockquote?: StyleMatcher
    h1?: StyleMatcher
    h2?: StyleMatcher
    h3?: StyleMatcher
    h4?: StyleMatcher
    h5?: StyleMatcher
    h6?: StyleMatcher
  }
  listItem?: {
    number?: ListItemMatcher
    bullet?: ListItemMatcher
    task?: ListItemMatcher
  }
  types?: {
    code?: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule?: ObjectMatcher
    image?: ObjectMatcher<{
      src: string
      alt: string
      title: string | undefined
    }>
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{
      headerRows: number | undefined
      rows: Array<unknown>
    }>
    callout?: ObjectMatcher<{tone: string; content: Array<PortableTextBlock>}>
    blockquote?: ObjectMatcher<{content: Array<PortableTextBlock>}>
    list?: ObjectMatcher<{kind: string; items: Array<unknown>}>
  }
  html?: {
    inline?: 'skip' | 'text'
  }
}

interface ResolvedOptions {
  schema: Schema
  keyGenerator: () => string
  marks: {
    strong: DecoratorMatcher
    em: DecoratorMatcher
    code: DecoratorMatcher
    strikeThrough: DecoratorMatcher
    link: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block: {
    normal: StyleMatcher
    blockquote: StyleMatcher
    h1: StyleMatcher
    h2: StyleMatcher
    h3: StyleMatcher
    h4: StyleMatcher
    h5: StyleMatcher
    h6: StyleMatcher
  }
  listItem: {
    number: ListItemMatcher
    bullet: ListItemMatcher
    task: ListItemMatcher
  }
  types: {
    code: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule: ObjectMatcher
    image?: ObjectMatcher<{src: string; alt: string; title: string | undefined}>
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{headerRows: number | undefined; rows: Array<unknown>}>
    callout?: ObjectMatcher<{tone: string; content: Array<PortableTextBlock>}>
    blockquote?: ObjectMatcher<{content: Array<PortableTextBlock>}>
    list?: ObjectMatcher<{kind: string; items: Array<unknown>}>
  }
}

function resolveOptions(options: ParseOptions): ResolvedOptions {
  return {
    schema: options.schema ?? defaultSchema,
    keyGenerator: options.keyGenerator ?? defaultKeyGenerator,
    marks: {
      strong: options.marks?.strong ?? buildDecoratorMatcher(defaultStrongDecoratorDefinition),
      em: options.marks?.em ?? buildDecoratorMatcher(defaultEmDecoratorDefinition),
      code: options.marks?.code ?? buildDecoratorMatcher(defaultCodeDecoratorDefinition),
      strikeThrough: options.marks?.strikeThrough ?? buildDecoratorMatcher(defaultStrikeThroughDecoratorDefinition),
      link: options.marks?.link ?? buildAnnotationMatcher(defaultLinkObjectDefinition),
    },
    block: {
      normal: options.block?.normal ?? buildStyleMatcher(normalStyleDefinition),
      blockquote: options.block?.blockquote ?? buildStyleMatcher(blockquoteStyleDefinition),
      h1: options.block?.h1 ?? buildStyleMatcher(h1StyleDefinition),
      h2: options.block?.h2 ?? buildStyleMatcher(h2StyleDefinition),
      h3: options.block?.h3 ?? buildStyleMatcher(h3StyleDefinition),
      h4: options.block?.h4 ?? buildStyleMatcher(h4StyleDefinition),
      h5: options.block?.h5 ?? buildStyleMatcher(h5StyleDefinition),
      h6: options.block?.h6 ?? buildStyleMatcher(h6StyleDefinition),
    },
    listItem: {
      number: options.listItem?.number ?? buildListItemMatcher(defaultOrderedListItemDefinition),
      bullet: options.listItem?.bullet ?? buildListItemMatcher(defaultUnorderedListItemDefinition),
      task: options.listItem?.task ?? buildListItemMatcher(defaultTaskListItemDefinition),
    },
    types: {
      code: options.types?.code ?? buildObjectMatcher(defaultCodeObjectDefinition),
      horizontalRule: options.types?.horizontalRule ?? buildObjectMatcher(defaultHorizontalRuleObjectDefinition),
      image: options.types?.image ?? buildObjectMatcher(defaultImageObjectDefinition),
      html: options.types?.html ?? buildObjectMatcher(defaultHtmlObjectDefinition),
      table: options.types?.table,
      callout: options.types?.callout ?? buildObjectMatcher(defaultCalloutObjectDefinition),
      blockquote: options.types?.blockquote,
      list: options.types?.list,
    },
  }
}

export function parseToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  const resolved = resolveOptions(options)
  const lexer = new BlockLexer(markdown)
  const out: Array<PortableTextBlock | PortableTextObject> = []

  let paragraphLines: Array<string> = []
  let paragraphStartLine = 0
  let blockquoteLines: Array<string> = []
  let listStack: Array<{kind: 'bullet' | 'number' | 'task'; indent: number; level: number}> = []
  // Buffered list items when types.list is registered: each entry is a
  // top-level item that becomes the items[] of one list block-object.
  let pendingList: {kind: 'bullet' | 'number' | 'task'; items: Array<{
    _key: string
    _type: 'list-item'
    checked?: boolean
    content: Array<unknown>
  }>} | null = null

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    const body = paragraphLines.join('\n')
    const block = makeTextBlock('normal', body, resolved, paragraphStartLine)
    paragraphLines = []
    if (!block) return
    // If the paragraph contains exactly one non-span child (a block-object
    // produced by an inline image), hoist that as a block instead of
    // wrapping it in a text block.
    const children = block.children ?? []
    const nonSpan = children.filter((c) => (c as {_type: string})._type !== 'span')
    const onlySpans = children.length === nonSpan.length + children.filter((c) => (c as {_type: string})._type === 'span' && ((c as {text: string}).text === '' || (c as {text: string}).text === undefined)).length
    if (nonSpan.length === 1 && (onlySpans || children.length === 1)) {
      out.push(nonSpan[0] as PortableTextObject)
      return
    }
    out.push(block)
  }

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return
    // GFM alert / callout: `> [!NOTE]\n> body` parses to a callout
    // block-object with `tone: 'note'` and `content` array. When a
    // `types.callout` matcher is provided we consume the alert syntax;
    // otherwise the lines fall through to a flat blockquote.
    const firstLine = blockquoteLines[0] ?? ''
    const alertMatch = firstLine.match(/^\[!([A-Z]+)\]\s*$/)
    if (alertMatch) {
      let committed = false
      // Probe the schema before invoking the matcher — the default
      // buildObjectMatcher allocates a _key as soon as it's called,
      // even if it ultimately returns undefined. Pre-checking lets us
      // skip the wasted allocation when the schema doesn't declare a
      // `callout` block-object.
      const hasCalloutSchema = resolved.schema.blockObjects.some(
        (b) => b.name === 'callout',
      )
      if (resolved.types.callout && hasCalloutSchema) {
        const tone = alertMatch[1]?.toLowerCase() ?? 'note'
        const rest = blockquoteLines.slice(1)
        const content = rest
          .filter((line) => line !== '')
          .map((line) => makeTextBlock('blockquote', line, resolved, 0))
          .filter((b): b is PortableTextTextBlock => Boolean(b))
        const callout = resolved.types.callout({
          context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
          value: {tone, content: content as Array<PortableTextBlock>},
          isInline: false,
        })
        if (callout) {
          out.push(callout)
          blockquoteLines = []
          committed = true
        }
      }
      if (committed) return
      // Callout matcher returned undefined (or wasn't registered): drop
      // the `[!XXX]` line and process the remaining lines as a flat
      // blockquote.
      blockquoteLines = blockquoteLines.slice(1)
      if (blockquoteLines.length === 0) return
    }

    // Container path: when types.blockquote is registered, the entire
    // quote becomes one block-object whose content is the (recursively
    // parsed) inner blocks. Each inner text block stays at style 'normal'.
    if (resolved.types.blockquote) {
      const innerSource = blockquoteLines.join('\n')
      blockquoteLines = []
      const innerBlocks = parseToPortableText(innerSource, options)
      const value = resolved.types.blockquote({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {content: innerBlocks as Array<PortableTextBlock>},
        isInline: false,
      })
      if (value) out.push(value)
      return
    }

    // If any line still has a leading blockquote / list marker, the body
    // is a nested structure: recursively parse it and propagate the inner
    // blocks unchanged (so style/listItem survive). Otherwise use the flat
    // path: split on blank-quote lines into paragraphs, each tagged with
    // style 'blockquote'.
    const isNested = blockquoteLines.some(
      (line) => /^(?:>|[-*+]\s|\d+[.)]\s)/.test(line.trimStart()),
    )
    if (isNested) {
      const innerSource = blockquoteLines.join('\n')
      blockquoteLines = []
      const inner = parseToPortableText(innerSource, options)
      for (const node of inner) {
        if (node._type === 'block') {
          const textBlock = node as PortableTextTextBlock
          if (!textBlock.listItem && textBlock.style === 'normal') {
            const restyledName = resolved.block.blockquote({
              context: {schema: resolved.schema},
            })
            if (restyledName) {
              ;(textBlock as PortableTextTextBlock).style = restyledName
            }
          }
        }
        out.push(node)
      }
      return
    }
    const paragraphs: Array<Array<string>> = [[]]
    for (const line of blockquoteLines) {
      if (line === '') paragraphs.push([])
      else (paragraphs[paragraphs.length - 1] ?? []).push(line)
    }
    blockquoteLines = []
    for (const lines of paragraphs) {
      if (lines.length === 0) continue
      const block = makeTextBlock('blockquote', lines.join('\n'), resolved, 0)
      if (block) out.push(block)
    }
  }

  const flushList = () => {
    listStack = []
    if (pendingList && resolved.types.list) {
      const value = resolved.types.list({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {kind: pendingList.kind, items: pendingList.items as Array<unknown>},
        isInline: false,
      })
      if (value) {
        out.push(value)
      } else {
        // Matcher returned undefined: re-emit the buffered items as
        // flat list-item text blocks so the document keeps the list
        // structure.
        for (const item of pendingList.items) {
          for (const block of item.content) {
            const b = block as PortableTextTextBlock
            if (b && b._type === 'block') {
              ;(b as PortableTextTextBlock).listItem =
                pendingList.kind === 'task' ? 'bullet' : pendingList.kind
              ;(b as PortableTextTextBlock).level = 1
              if (pendingList.kind === 'task' && item.checked !== undefined) {
                ;(b as PortableTextTextBlock & {checked?: boolean}).checked = item.checked
              }
              out.push(b)
            }
          }
        }
      }
    }
    pendingList = null
  }

  while (true) {
    const token = lexer.next()
    if (token.type === BlockTokenType.Eof) break

    if (token.type === BlockTokenType.BlankLine) {
      flushParagraph()
      flushBlockquote()
      flushList()
      continue
    }

    if (token.type === BlockTokenType.Heading) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const headingStyle = ('h' + (token.level ?? 1)) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const block = makeTextBlock(headingStyle, token.text, resolved, token.location.line)
      if (block) out.push(block)
      continue
    }

    if (token.type === BlockTokenType.ThematicBreak) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const value = resolved.types.horizontalRule({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {},
        isInline: false,
      })
      if (value) out.push(value)
      continue
    }

    if (token.type === BlockTokenType.FenceOpen) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const language = token.info ?? ''
      const codeLines: Array<string> = []
      lexer.enterFencedCode(detectMarker(markdown, token.location.line))
      while (true) {
        const next = lexer.next()
        if (next.type === BlockTokenType.FenceClose || next.type === BlockTokenType.Eof) break
        if (next.type === BlockTokenType.CodeLine) codeLines.push(next.text)
      }
      const value = resolved.types.code({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {language: language || undefined, code: codeLines.join('\n')},
        isInline: false,
      })
      if (value) {
        out.push(value)
      } else {
        // No code matcher: fall back to a normal-style paragraph
        // containing the code body as plain text. Matches v1.
        const block = makeTextBlock('normal', codeLines.join('\n'), resolved, token.location.line)
        if (block) out.push(block)
      }
      continue
    }

    if (token.type === BlockTokenType.BlockquotePrefix) {
      flushParagraph()
      flushList()
      blockquoteLines.push(token.text)
      continue
    }

    if (token.type === BlockTokenType.ListItemStart) {
      flushParagraph()
      flushBlockquote()
      const kind = token.listKind ?? 'bullet'

      // Container path: when types.list is registered we buffer items
      // into a single list block-object instead of emitting them flat.
      if (resolved.types.list) {
        if (!pendingList || pendingList.kind !== kind) {
          // Different kind starts a new list (flush the current one).
          if (pendingList) {
            const value = resolved.types.list({
              context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
              value: {kind: pendingList.kind, items: pendingList.items as Array<unknown>},
              isInline: false,
            })
            if (value) out.push(value)
          }
          pendingList = {kind, items: []}
        }
        // Allocate the list-item key BEFORE the inner block/span keys to
        // match v1 (list-item k0, block k1, span k2). Multi-block list items
        // (lazy continuation, item-with-code-block, etc.) are out of scope
        // for the spike; one text block per item.
        const itemKey = resolved.keyGenerator()
        const block = makeTextBlock('normal', token.text, resolved, token.location.line)
        const item: {_key: string; _type: 'list-item'; checked?: boolean; content: Array<unknown>} = {
          _key: itemKey,
          _type: 'list-item',
          content: block ? [block] : [],
        }
        if (kind === 'task') item.checked = token.taskChecked ?? false
        pendingList.items.push(item)
        continue
      }

      while (listStack.length > 0) {
        const top = listStack[listStack.length - 1]
        if (top && top.indent >= token.indent) {
          listStack.pop()
        } else break
      }
      const level = listStack.length + 1
      listStack.push({kind, indent: token.indent, level})
      const block = makeTextBlock('normal', token.text, resolved, token.location.line)
      if (block) {
        // For task items we try the task matcher first; if undefined (the
        // schema doesn't declare a task list type), fall back to bullet.
        let listItemName = resolved.listItem[kind]({
          context: {schema: resolved.schema},
        })
        if (!listItemName && kind === 'task') {
          listItemName = resolved.listItem.bullet({
            context: {schema: resolved.schema},
          })
        }
        if (listItemName) {
          ;(block as PortableTextTextBlock).listItem = listItemName
          ;(block as PortableTextTextBlock).level = level
          // For task items, attach `checked` only when the task list type
          // resolved (i.e. the schema knows about task lists). On bullet
          // fallback we drop `checked` to keep the block-shape minimal.
          if (kind === 'task' && resolved.listItem.task({context: {schema: resolved.schema}})) {
            ;(block as PortableTextTextBlock & {checked?: boolean}).checked =
              token.taskChecked ?? false
          }
        }
        out.push(block)
      }
      continue
    }

    if (token.type === BlockTokenType.HtmlBlock) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const lines: Array<string> = [token.text]
      while (true) {
        const peek = lexer.peek()
        if (peek.type !== BlockTokenType.HtmlBlock) break
        lexer.next()
        lines.push(peek.text)
      }
      const htmlValue = resolved.types.html?.({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {html: lines.join('\n')},
        isInline: false,
      })
      if (htmlValue) {
        out.push(htmlValue)
      } else {
        // No html matcher: fall back to a normal paragraph with the
        // HTML as literal text.
        const block = makeTextBlock('normal', lines.join('\n'), resolved, token.location.line)
        if (block) out.push(block)
      }
      continue
    }

    if (token.type === BlockTokenType.TableRow) {
      flushParagraph()
      flushBlockquote()
      flushList()
      // Peek: a delimiter row (`| --- |`) confirms this is a GFM table.
      // Otherwise we treat the row as a paragraph line.
      const next = lexer.peek()
      const isDelim =
        next.type === BlockTokenType.TableRow &&
        (next.cells ?? []).every((c) => /^:?-+:?$/.test(c))
      if (!isDelim) {
        if (paragraphLines.length === 0) paragraphStartLine = token.location.line
        paragraphLines.push(token.text)
        continue
      }
      // Consume the delimiter row and any subsequent table-row tokens.
      lexer.next()
      const headerCells = token.cells ?? []
      const bodyRows: Array<Array<string>> = []
      while (true) {
        const peek = lexer.peek()
        if (peek.type !== BlockTokenType.TableRow) break
        lexer.next()
        bodyRows.push(peek.cells ?? [])
      }
      const matcher = resolved.types.table
      if (!matcher) {
        // No table matcher: fall back to plain paragraph of the source.
        const block = makeTextBlock('normal', token.text, resolved, token.location.line)
        if (block) out.push(block)
        continue
      }
      const buildCell = (text: string): unknown => {
        // Build content first so the inner block keys are allocated
        // before the cell key, matching v1's depth-first allocation
        // order (block, span, ..., cell, ..., row).
        const value = [makeTextBlock('normal', text, resolved, token.location.line)]
        return {
          _type: 'cell',
          _key: resolved.keyGenerator(),
          value,
        }
      }
      const buildRow = (cells: Array<string>): unknown => {
        const built = cells.map(buildCell)
        return {
          _key: resolved.keyGenerator(),
          _type: 'row',
          cells: built,
        }
      }
      const rows = [buildRow(headerCells), ...bodyRows.map(buildRow)]
      const tableValue = matcher({
        context: {schema: resolved.schema, keyGenerator: resolved.keyGenerator},
        value: {headerRows: 1, rows: rows as never},
        isInline: false,
      })
      if (tableValue) out.push(tableValue)
      continue
    }

    if (token.type === BlockTokenType.Paragraph) {
      flushBlockquote()
      flushList()
      if (paragraphLines.length === 0) paragraphStartLine = token.location.line
      paragraphLines.push(token.text)
      continue
    }
  }

  flushParagraph()
  flushBlockquote()
  flushList()
  return out
}

function makeTextBlock(
  styleKey: 'normal' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  body: string,
  options: ResolvedOptions,
  startLine: number,
): PortableTextTextBlock | undefined {
  const styleName = options.block[styleKey]({
    context: {schema: options.schema},
  })
  // If the style matcher doesn't resolve (e.g. h1 with no h1 schema), we
  // fall back to the 'normal' style matcher. If that also doesn't resolve,
  // the block is dropped (defensive — should never happen with default
  // schema).
  const resolvedStyle =
    styleName ?? options.block.normal({context: {schema: options.schema}})
  if (!resolvedStyle) return undefined

  // Allocate block key BEFORE span keys to match v1's order.
  const blockKey = options.keyGenerator()
  const inline = lexInline(body, startLine)
  const {children, markDefs} = foldInlineToSpans(inline, options)
  return {
    _type: 'block',
    _key: blockKey,
    style: resolvedStyle,
    children,
    markDefs,
  } as PortableTextTextBlock
}

interface SpanState {
  text: string
  marks: Array<string>
}

function foldInlineToSpans(
  tokens: ReadonlyArray<InlineToken>,
  options: ResolvedOptions,
): {
  children: Array<PortableTextSpan>
  markDefs: Array<{_type: string; _key: string; [key: string]: unknown}>
} {
  const children: Array<PortableTextSpan> = []
  const markDefs: Array<{_type: string; _key: string; [key: string]: unknown}> =
    []
  // Each entry: the schema-resolved decorator name (or undefined for
  // `unknown`) and the original markdown marker text. When the matcher
  // returns undefined, we leak the marker into the span text on both
  // open and close so `**foo**` becomes literal `**foo**` text rather
  // than just `foo`.
  const decoratorStack: Array<{name: string | undefined; marker: string}> = []
  const annotationStack: Array<string> = []
  let current: SpanState = {text: '', marks: []}

  const flush = () => {
    if (current.text.length === 0) return
    children.push({
      _type: 'span',
      _key: options.keyGenerator(),
      text: current.text,
      marks: current.marks.slice(),
    } as PortableTextSpan)
    current = {text: '', marks: current.marks.slice()}
  }

  const updateMarks = () => {
    const active = decoratorStack
      .map((d) => d.name)
      .filter((d): d is string => Boolean(d))
    current.marks = [...active, ...annotationStack]
  }

  for (const t of tokens) {
    switch (t.type) {
      case InlineTokenType.Text: {
        current.text += t.text
        break
      }
      case InlineTokenType.SoftBreak:
      case InlineTokenType.HardBreak: {
        current.text += '\n'
        break
      }
      case InlineTokenType.StrongOpen: {
        const name = options.marks.strong({context: {schema: options.schema}})
        if (name) flush()
        decoratorStack.push({name, marker: '**'})
        if (name) updateMarks()
        break
      }
      case InlineTokenType.StrongClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.EmOpen: {
        const name = options.marks.em({context: {schema: options.schema}})
        if (name) flush()
        decoratorStack.push({name, marker: '_'})
        if (name) updateMarks()
        break
      }
      case InlineTokenType.EmClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.StrikeOpen: {
        const name = options.marks.strikeThrough({context: {schema: options.schema}})
        if (name) flush()
        decoratorStack.push({name, marker: '~~'})
        if (name) updateMarks()
        break
      }
      case InlineTokenType.StrikeClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.CodeSpan: {
        flush()
        const codeMark = options.marks.code({context: {schema: options.schema}})
        children.push({
          _type: 'span',
          _key: options.keyGenerator(),
          text: t.text,
          marks: codeMark ? [...current.marks, codeMark] : [...current.marks],
        } as PortableTextSpan)
        break
      }
      case InlineTokenType.LinkOpen: {
        // Flush the pre-link text first so its span key is allocated
        // before the markDef key (matches v1's allocation order).
        flush()
        const annotation = options.marks.link({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {href: t.href ?? '', title: t.title},
        })
        if (annotation) {
          markDefs.push(
            annotation as {_type: string; _key: string; [key: string]: unknown},
          )
          annotationStack.push(annotation._key)
          updateMarks()
        } else {
          // No annotation: pass the link label through as plain text in the
          // current span. LinkClose will be a no-op.
          annotationStack.push('')
        }
        break
      }
      case InlineTokenType.LinkClose: {
        // Flush the link's inner text WITH the link mark still active,
        // then pop the annotation and refresh current.marks so the post-
        // link text accumulates without it.
        const top = annotationStack[annotationStack.length - 1]
        if (top && top !== '') {
          flush()
        }
        annotationStack.pop()
        updateMarks()
        break
      }
      case InlineTokenType.Image: {
        flush()
        const imageValue = options.types.image?.({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {src: t.src ?? '', alt: t.alt ?? '', title: t.title},
          isInline: true,
        })
        if (imageValue) {
          // Mark this span with a sentinel so the parent paragraph-flushing
          // logic can hoist a single-image-only paragraph to a block image.
          // For inline, the image goes inline alongside spans as an inline
          // object. Caller treats foldInlineToSpans output as children, so
          // we splice the inline-object into children directly.
          ;(children as Array<PortableTextSpan | PortableTextObject>).push(imageValue as PortableTextObject)
        }
        break
      }
      case InlineTokenType.Autolink: {
        flush()
        const annotation = options.marks.link({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {href: t.href ?? '', title: undefined},
        })
        if (annotation) {
          markDefs.push(annotation as {_type: string; _key: string; [key: string]: unknown})
          children.push({
            _type: 'span',
            _key: options.keyGenerator(),
            text: t.text,
            marks: [...current.marks, annotation._key],
          } as PortableTextSpan)
        } else {
          children.push({
            _type: 'span',
            _key: options.keyGenerator(),
            text: t.text,
            marks: [...current.marks],
          } as PortableTextSpan)
        }
        break
      }
    }
  }
  flush()

  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: options.keyGenerator(),
      text: '',
      marks: [],
    } as PortableTextSpan)
  }

  // Annotation stack uses '' as a sentinel for "no annotation"; strip those
  // from any per-span marks before returning (defensive — updateMarks
  // already excludes them).
  for (const child of children) {
    if (child._type === 'span') {
      child.marks = (child.marks ?? []).filter((m) => m !== '')
    }
  }

  return {children, markDefs}
}

function detectMarker(source: string, line: number): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const raw = lines[line - 1] ?? ''
  const m = raw.match(/^\s{0,3}(`{3,}|~{3,})/)
  return m?.[1] ?? '\`\`\`'
}
