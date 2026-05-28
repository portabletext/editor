/**
 * Parser for `@portabletext/markdown` v2 (spike).
 *
 * Consumes block tokens from `BlockLexer` and inline tokens from
 * `lexInline`, emitting Portable Text blocks directly. There is no
 * intermediate AST.
 *
 * Spike scope: paragraph, heading, fenced code, thematic break, blockquote
 * (flat path with `style: 'blockquote'`), bullet/ordered list (flat path
 * with `listItem` + `level`). Inline: strong/em/code/link/autolink/
 * hardbreak. See /specs/portabletext-markdown-v2.md §8.1.
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {defaultKeyGenerator} from '../../key-generator'
import {InlineTokenType, lexInline, type InlineToken} from './inline-lexer'
import {BlockLexer, BlockTokenType} from './lexer'

export interface ParseOptions {
  keyGenerator?: () => string
}

export function parseToPortableText(
  markdown: string,
  options: ParseOptions = {},
): Array<PortableTextBlock | PortableTextObject> {
  const lexer = new BlockLexer(markdown)
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator
  const out: Array<PortableTextBlock | PortableTextObject> = []

  // Paragraph accumulator: paragraph tokens consecutive without a blank line
  // are joined as one text block with soft-break newlines between them.
  let paragraphLines: Array<string> = []
  let paragraphStartLine = 0

  // Blockquote accumulator: contiguous `> ` lines are joined as paragraphs
  // with `style: 'blockquote'`. Blank-quote lines (`>` with no body) split
  // a multi-paragraph quote.
  let blockquoteLines: Array<string> = []

  // List accumulator: contiguous list items at the same indent form one
  // list. Different indents become different levels via the parser.
  // Spike: track only the current open list kind + indent stack.
  let listStack: Array<{
    kind: 'bullet' | 'number'
    indent: number
    level: number
  }> = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    const body = paragraphLines.join('\n')
    const block = makeTextBlock(
      'normal',
      body,
      keyGenerator,
      paragraphStartLine,
    )
    out.push(block)
    paragraphLines = []
  }

  const flushBlockquote = () => {
    if (blockquoteLines.length === 0) return
    // Each paragraph inside the quote is split by blank-quote lines.
    const paragraphs: Array<Array<string>> = [[]]
    for (const line of blockquoteLines) {
      if (line === '') paragraphs.push([])
      else (paragraphs[paragraphs.length - 1] ?? []).push(line)
    }
    for (const lines of paragraphs) {
      if (lines.length === 0) continue
      const block = makeTextBlock(
        'blockquote',
        lines.join('\n'),
        keyGenerator,
        0,
      )
      out.push(block)
    }
    blockquoteLines = []
  }

  const flushList = () => {
    listStack = []
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
      const block = makeTextBlock(
        `h${token.level}`,
        token.text,
        keyGenerator,
        token.location.line,
      )
      out.push(block)
      continue
    }

    if (token.type === BlockTokenType.ThematicBreak) {
      flushParagraph()
      flushBlockquote()
      flushList()
      out.push({
        _type: 'horizontal-rule',
        _key: keyGenerator(),
      } as PortableTextObject)
      continue
    }

    if (token.type === BlockTokenType.FenceOpen) {
      flushParagraph()
      flushBlockquote()
      flushList()
      const language = token.info ?? ''
      const codeLines: Array<string> = []
      // Manually consume the source line that contained the open fence by
      // reading from the lexer until FenceClose.
      // The lexer emitted the FenceOpen; we now need to put it into
      // fenced-code mode and pull lines.
      lexer.enterFencedCode(detectMarker(markdown, token.location.line))
      while (true) {
        const next = lexer.next()
        if (
          next.type === BlockTokenType.FenceClose ||
          next.type === BlockTokenType.Eof
        )
          break
        if (next.type === BlockTokenType.CodeLine) codeLines.push(next.text)
      }
      out.push({
        _type: 'code',
        _key: keyGenerator(),
        language: language || undefined,
        code: codeLines.join('\n'),
      } as unknown as PortableTextObject)
      continue
    }

    if (token.type === BlockTokenType.BlockquotePrefix) {
      flushParagraph()
      flushList()
      // Body may be empty (blank quote line, used as paragraph splitter inside the quote).
      blockquoteLines.push(token.text)
      continue
    }

    if (token.type === BlockTokenType.ListItemStart) {
      flushParagraph()
      flushBlockquote()
      const kind = token.listKind ?? 'bullet'
      // Determine level by comparing indent against the stack. Pop any frames
      // whose indent is >= the new item's indent: same indent means a sibling
      // (replace the previous frame), greater means a closed deeper level.
      // The remaining stack depth is the new item's level - 1.
      while (listStack.length > 0) {
        const top = listStack[listStack.length - 1]
        if (top && top.indent >= token.indent) {
          listStack.pop()
        } else break
      }
      const level = listStack.length + 1
      listStack.push({kind, indent: token.indent, level})
      const block = makeTextBlock(
        'normal',
        token.text,
        keyGenerator,
        token.location.line,
      )
      block.listItem = kind
      block.level = level
      out.push(block)
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
  style: string,
  body: string,
  keyGenerator: () => string,
  startLine: number,
): PortableTextTextBlock {
  const inline = lexInline(body, startLine)
  const {children, markDefs} = foldInlineToSpans(inline, keyGenerator)
  return {
    _type: 'block',
    _key: keyGenerator(),
    style,
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
  keyGenerator: () => string,
): {
  children: Array<PortableTextSpan>
  markDefs: Array<{_type: string; _key: string; [key: string]: unknown}>
} {
  const children: Array<PortableTextSpan> = []
  const markDefs: Array<{_type: string; _key: string; [key: string]: unknown}> =
    []
  const decoratorStack: Array<'strong' | 'em'> = []
  // Stack of active annotation keys (links).
  const annotationStack: Array<string> = []
  let current: SpanState = {text: '', marks: []}

  const flush = () => {
    if (current.text.length === 0 && children.length > 0) return
    if (current.text.length === 0) return
    children.push({
      _type: 'span',
      _key: keyGenerator(),
      text: current.text,
      marks: current.marks.slice(),
    } as PortableTextSpan)
    current = {text: '', marks: current.marks.slice()}
  }

  const updateMarks = () => {
    current.marks = [...decoratorStack, ...annotationStack]
  }

  for (const t of tokens) {
    switch (t.type) {
      case InlineTokenType.Text: {
        current.text += t.text
        break
      }
      case InlineTokenType.SoftBreak: {
        // In Portable Text, a soft break is a literal \n inside a span.
        current.text += '\n'
        break
      }
      case InlineTokenType.HardBreak: {
        // Flush, push a span with text `\n` (the marker the existing v1
        // toolkit treats as hard break), continue with same marks.
        flush()
        children.push({
          _type: 'span',
          _key: keyGenerator(),
          text: '\n',
          marks: current.marks.slice(),
        } as PortableTextSpan)
        break
      }
      case InlineTokenType.StrongOpen: {
        flush()
        decoratorStack.push('strong')
        updateMarks()
        break
      }
      case InlineTokenType.StrongClose: {
        flush()
        decoratorStack.pop()
        updateMarks()
        break
      }
      case InlineTokenType.EmOpen: {
        flush()
        decoratorStack.push('em')
        updateMarks()
        break
      }
      case InlineTokenType.EmClose: {
        flush()
        decoratorStack.pop()
        updateMarks()
        break
      }
      case InlineTokenType.CodeSpan: {
        flush()
        children.push({
          _type: 'span',
          _key: keyGenerator(),
          text: t.text,
          marks: [...current.marks, 'code'],
        } as PortableTextSpan)
        break
      }
      case InlineTokenType.LinkOpen: {
        flush()
        const key = keyGenerator()
        markDefs.push({
          _type: 'link',
          _key: key,
          href: t.href ?? '',
          ...(t.title ? {title: t.title} : {}),
        })
        annotationStack.push(key)
        updateMarks()
        break
      }
      case InlineTokenType.LinkClose: {
        flush()
        annotationStack.pop()
        updateMarks()
        break
      }
      case InlineTokenType.Autolink: {
        flush()
        const key = keyGenerator()
        markDefs.push({_type: 'link', _key: key, href: t.href ?? ''})
        children.push({
          _type: 'span',
          _key: keyGenerator(),
          text: t.text,
          marks: [...current.marks, key],
        } as PortableTextSpan)
        break
      }
    }
  }
  flush()

  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: keyGenerator(),
      text: '',
      marks: [],
    } as PortableTextSpan)
  }
  return {children, markDefs}
}

function detectMarker(source: string, line: number): string {
  // Re-scan the source line to recover the fence marker run (length matters
  // for matching the close). For the spike we assume the fence is on a line
  // by itself, possibly preceded by up to 3 spaces.
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const raw = lines[line - 1] ?? ''
  const m = raw.match(/^\s{0,3}(`{3,}|~{3,})/)
  return m?.[1] ?? '\`\`\`'
}
