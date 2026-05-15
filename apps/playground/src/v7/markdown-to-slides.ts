import type {PortableTextBlock} from '@portabletext/editor'
import {
  markdownToPortableText,
  type ObjectMatcher,
} from '@portabletext/markdown'

/**
 * Parse a markdown source string into deck slides.
 *
 * Slides are separated by horizontal rules (`---` on its own line) — the
 * same convention Marp and Slidev use. Each chunk between rules becomes
 * one slide; the chunk's markdown is converted to Portable Text blocks
 * and wrapped in a `slide` container.
 *
 * If the source has no horizontal rules, it parses to one big slide.
 */
export function markdownToSlides(
  source: string,
  keyGenerator: () => string,
): Array<PortableTextBlock> {
  const chunks = splitOnHorizontalRules(source)
  if (chunks.length === 0) {
    return [emptySlide(keyGenerator)]
  }

  return chunks.map((chunk, index) => {
    // The parser's default schema is permissive. We drop the deck
    // schema arg and trust matchers to shape containers correctly;
    // anything the deck schema does not declare is filtered when the
    // editor validates at insert.
    const blocks = markdownToPortableText(chunk, {
      keyGenerator,
      types: deckMatchers,
    })

    return {
      _type: 'slide',
      _key: keyGenerator(),
      content: blocks.length > 0 ? blocks : emptySlideContent(keyGenerator),
      // Preserve source order for stable hash links across reloads.
      _slideIndex: index,
    } as unknown as PortableTextBlock
  })
}

/**
 * Split a markdown source on horizontal-rule lines (`---` / `***` /
 * `___` on their own line, optionally surrounded by blank lines).
 *
 * The rule itself is dropped — only the content between rules survives.
 */
function splitOnHorizontalRules(source: string): Array<string> {
  const lines = source.split('\n')
  const chunks: Array<string> = []
  let current: Array<string> = []

  const isRule = (line: string) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)

  for (const line of lines) {
    if (isRule(line)) {
      if (current.length > 0) {
        chunks.push(current.join('\n').trim())
      }
      current = []
      continue
    }
    current.push(line)
  }

  if (current.length > 0) {
    const tail = current.join('\n').trim()
    if (tail.length > 0) {
      chunks.push(tail)
    }
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

/**
 * Matchers for the deck schema. Lifted from pilcrow's markdown
 * configuration — code blocks become `code-block` containers with
 * per-line text blocks, tables become `table` containers with rich
 * cell content, GFM alerts become `callout` containers.
 *
 * The deck schema has no `horizontal-rule` or `list` containers, so
 * those parser outputs are dropped (lists stay flat as `listItem`-
 * marked blocks, horizontal rules are consumed by the slide split
 * before parsing).
 */
type AnyValue = Record<string, unknown>

const codeMatcher: ObjectMatcher<AnyValue> = ({context, value, isInline}) => {
  if (isInline) {
    return undefined
  }
  const code = typeof value.code === 'string' ? value.code : ''
  const sourceLines = code.split('\n')
  if (sourceLines.length > 0 && sourceLines[sourceLines.length - 1] === '') {
    sourceLines.pop()
  }
  const lines = sourceLines.map((text) => ({
    _type: 'block',
    _key: context.keyGenerator(),
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: context.keyGenerator(),
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }))
  const language =
    typeof value.language === 'string' ? value.language : undefined
  return {
    _type: 'code-block',
    _key: context.keyGenerator(),
    ...(language ? {language} : {}),
    lines,
  }
}

const tableMatcher: ObjectMatcher<AnyValue> = ({context, value}) => {
  const rows = (
    value.rows as Array<{
      _key: string
      cells: Array<{_key: string; value: unknown}>
    }>
  ).map((row) => ({
    _type: 'row',
    _key: row._key,
    cells: row.cells.map((cell) => ({
      _type: 'cell',
      _key: cell._key,
      content: cell.value,
    })),
  }))
  return {
    _type: 'table',
    _key: context.keyGenerator(),
    ...(value.headerRows !== undefined ? {headerRows: value.headerRows} : {}),
    rows,
  }
}

const calloutMatcher: ObjectMatcher<AnyValue> = ({context, value}) => {
  // GFM-alert syntax stamps every text block inside the alert with
  // style: 'blockquote'. The callout chrome owns the visual frame; the
  // inner blocks should render as normal prose.
  const content = (value.content as Array<{_type: string; style?: string}>).map(
    (block) =>
      block._type === 'block' && block.style === 'blockquote'
        ? {...block, style: 'normal'}
        : block,
  )
  return {
    _type: 'callout',
    _key: context.keyGenerator(),
    tone: value.tone,
    content,
  }
}

const deckMatchers = {
  code: codeMatcher,
  table: tableMatcher,
  callout: calloutMatcher,
}

function emptySlide(keyGenerator: () => string): PortableTextBlock {
  return {
    _type: 'slide',
    _key: keyGenerator(),
    content: emptySlideContent(keyGenerator),
  } as unknown as PortableTextBlock
}

function emptySlideContent(keyGenerator: () => string) {
  return [
    {
      _type: 'block',
      _key: keyGenerator(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: '',
          marks: [],
        },
      ],
    },
  ]
}
