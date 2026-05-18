/**
 * Pilcrow's markdown round-trip configuration.
 *
 * Shapes the parser/serializer to round-trip cleanly against pilcrow's
 * schema. The default `@portabletext/markdown` matchers produce shapes
 * that match the editor's default schema; pilcrow uses different field
 * names and a richer code-block structure so we wire matchers per type.
 *
 *   - code: parser emits `{language, code: string}` flat. Pilcrow stores
 *     code as `code-block.lines: textBlock[]` where each line is its own
 *     block. We split the source on newlines and synthesize one block
 *     per line so caret navigation works line-by-line.
 *
 *   - table: parser emits `cells[i].value`. Pilcrow's cell schema uses
 *     `content`. Rename on the way in.
 *
 *   - horizontalRule: parser emits type name `horizontalRule`. Pilcrow
 *     uses `horizontal-rule` to mirror the markdown spec wording.
 *
 *   - callout: parser stamps `style: 'blockquote'` on every text block
 *     inside an alert because GFM alerts reuse blockquote syntax. The
 *     blockquote rendering would stack inside the callout chrome, so we
 *     strip the style back to normal.
 */

import type {ObjectMatcher} from '@portabletext/markdown'
/**
 * Pilcrow's serializer renderers. Wired into `portableTextToMarkdown`
 * to translate pilcrow's editor shape back to a markdown string.
 *
 *   - code-block: walks `lines[].children[]` spans, concatenates with
 *     newlines, wraps in a fenced block. The language attribute is
 *     emitted on the opening fence when present.
 *
 *   - table: pilcrow stores rows[].cells[].content as block arrays. The
 *     renderer renders each cell's content inline (single line) and
 *     joins with pipes, since markdown tables don't support multi-line
 *     cells. Header row separator added when headerRows is set.
 *
 *   - image: emits `![alt](src "title")` with optional title attribute.
 *
 *   - horizontal-rule: standard `---` rule.
 *
 *   - callout: reuses the built-in GFM alert renderer.
 */

import {
  DefaultCalloutRenderer,
  DefaultHorizontalRuleRenderer,
  type PortableTextRenderers,
  type PortableTextTypeRenderer,
} from '@portabletext/markdown'
import type {PortableTextBlock} from '@portabletext/schema'

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

const horizontalRuleMatcher: ObjectMatcher<AnyValue> = ({context}) => ({
  _type: 'horizontal-rule',
  _key: context.keyGenerator(),
})

const calloutMatcher: ObjectMatcher<AnyValue> = ({context, value}) => ({
  _type: 'callout',
  _key: context.keyGenerator(),
  tone: value.tone,
  content: (value.content as PortableTextBlock[]).map((block) =>
    block._type === 'block' &&
    (block as {style?: string}).style === 'blockquote'
      ? {...block, style: 'normal'}
      : block,
  ),
})

/**
 * Matchers wired into `markdownToPortableText({types: ...})`. Pass the
 * editor's `schema` + `keyGenerator` alongside.
 */
export const pilcrowMatchers = {
  code: codeMatcher,
  table: tableMatcher,
  horizontalRule: horizontalRuleMatcher,
  callout: calloutMatcher,
}

type CodeLine = {children?: Array<{_type: string; text?: string}>}
type Cell = {_type: 'cell'; content: Array<unknown>}
type Row = {_type: 'row'; cells: Array<Cell>}

const codeBlockRenderer: PortableTextTypeRenderer = ({value}) => {
  const codeBlockValue = value as {language?: string; lines?: Array<CodeLine>}
  const lines = codeBlockValue.lines ?? []
  const code = lines
    .map((line) =>
      (line.children ?? [])
        .map((child) => (child._type === 'span' ? (child.text ?? '') : ''))
        .join(''),
    )
    .join('\n')
  const fence = codeBlockValue.language
    ? `\`\`\`${codeBlockValue.language}`
    : '```'
  return `${fence}\n${code}\n\`\`\``
}

const tableRenderer: PortableTextTypeRenderer = ({value, renderNode}) => {
  const tableValue = value as {headerRows?: number; rows?: Array<Row>}
  const rows = tableValue.rows ?? []
  if (rows.length === 0 || rows[0]?.cells.length === 0) {
    return ''
  }
  const headerRows = tableValue.headerRows ?? 0
  const renderCell = (cell: Cell): string => {
    return cell.content
      .map((block, index) =>
        renderNode({
          node: block as Parameters<typeof renderNode>[0]['node'],
          index,
          isInline: false,
          renderNode,
        }),
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const out: Array<string> = []
  for (let i = 0; i < headerRows; i++) {
    const row = rows[i]
    if (!row) {
      continue
    }
    out.push(`| ${row.cells.map(renderCell).join(' | ')} |`)
  }
  if (headerRows > 0) {
    const firstRow = rows[0]
    if (firstRow) {
      const sep = firstRow.cells.map(() => ' --- ').join('|')
      out.push(`|${sep}|`)
    }
  }
  for (let i = headerRows; i < rows.length; i++) {
    const row = rows[i]
    if (!row) {
      continue
    }
    out.push(`| ${row.cells.map(renderCell).join(' | ')} |`)
  }
  return out.join('\n')
}

const imageRenderer: PortableTextTypeRenderer = ({value}) => {
  const image = value as {src?: string; alt?: string; title?: string}
  const alt = image.alt ?? ''
  const src = image.src ?? ''
  const title = image.title ? ` "${image.title}"` : ''
  return `![${alt}](${src}${title})`
}

/**
 * Renderers wired into `portableTextToMarkdown(value, pilcrowRenderers)`.
 */
export const pilcrowRenderers: Partial<PortableTextRenderers> = {
  types: {
    'code-block': codeBlockRenderer,
    'table': tableRenderer,
    'image': imageRenderer,
    'horizontal-rule': DefaultHorizontalRuleRenderer,
    'callout': DefaultCalloutRenderer,
  },
}

/**
 * Pilcrow's schema represents lists and blockquotes as containers,
 * not as flat text blocks with a `listItem`/`style: 'blockquote'`
 * marker. The parser emits the flat form because that is the standard
 * Portable Text shape; foldToContainers walks the parser output and
 * groups the flat markers into pilcrow's container shape so the
 * resulting blocks slot into the pilcrow schema cleanly.
 *
 *   - Consecutive blocks with the same `listItem` value at `level` 1
 *     fold into one `list` container. The container's `kind` mirrors
 *     the parser's `bullet`/`number`/`task` value. Each item becomes
 *     a `list-item` whose `content` holds the original block stripped
 *     of its `listItem`/`level` fields. Task items carry their
 *     `checked` boolean.
 *
 *   - Consecutive blocks with `style: 'blockquote'` fold into a
 *     single `blockquote` container. The folded children have their
 *     style reset to `normal` because pilcrow's blockquote frame is
 *     applied by the container, not by the inner block's style.
 *
 * Nested list levels are not handled in this pass; only flat lists
 * round-trip. The parser already collapses adjacent indent levels to
 * the same level when called with the default schema in practice for
 * pilcrow's content shapes, so this gap rarely surfaces.
 */
type Block = {_type: string} & Record<string, unknown>
type ListKind = 'bullet' | 'number' | 'task'

function isListItem(block: Block): block is Block & {
  listItem: string
  level?: number
} {
  return (
    block._type === 'block' && typeof (block as Block).listItem === 'string'
  )
}

function mapListItemKind(listItem: string): ListKind | undefined {
  if (listItem === 'bullet' || listItem === 'number' || listItem === 'task') {
    return listItem
  }
  return undefined
}

function isBlockquoteStyle(block: Block): boolean {
  return block._type === 'block' && block.style === 'blockquote'
}

export function foldToContainers<T extends {_type: string}>(
  blocks: ReadonlyArray<T>,
  keyGenerator: () => string,
): Array<T> {
  const input = blocks as ReadonlyArray<Block>
  const out: Array<Block> = []
  let i = 0
  while (i < input.length) {
    const current = input[i]
    if (!current) {
      i++
      continue
    }

    if (isListItem(current)) {
      const kind = mapListItemKind(current.listItem)
      if (kind) {
        const items: Array<Block> = []
        while (i < input.length) {
          const next = input[i]
          if (!next || !isListItem(next)) {
            break
          }
          if (mapListItemKind(next.listItem) !== kind) {
            break
          }
          const {
            listItem: _listItem,
            level: _level,
            checked: nestedChecked,
            ...rest
          } = next as {
            listItem: string
            level?: number
            checked?: boolean
          }
          const checked = kind === 'task' ? Boolean(nestedChecked) : undefined
          items.push({
            _type: 'list-item',
            _key: keyGenerator(),
            ...(checked !== undefined ? {checked} : {}),
            content: [rest],
          })
          i++
        }
        out.push({
          _type: 'list',
          _key: keyGenerator(),
          kind,
          items,
        })
        continue
      }
    }

    if (isBlockquoteStyle(current)) {
      const content: Array<Block> = []
      while (i < input.length) {
        const next = input[i]
        if (!next || !isBlockquoteStyle(next)) {
          break
        }
        content.push({...next, style: 'normal'})
        i++
      }
      out.push({
        _type: 'blockquote',
        _key: keyGenerator(),
        content,
      })
      continue
    }

    out.push(current)
    i++
  }
  return out as unknown as Array<T>
}
