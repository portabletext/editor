import {isTypedObject} from '@portabletext/schema'
import type {PortableTextBlock, TypedObject} from '@portabletext/types'
import {
  escapeImageAndLinkText,
  escapeImageAndLinkTitle,
  escapeTableCell,
} from '../../escape'
import type {PortableTextTypeRenderer} from '../types'

/**
 * @public
 */
export const DefaultCodeBlockRenderer: PortableTextTypeRenderer<{
  _type: 'code'
  code: string
  language: string | undefined
}> = (options) => {
  if (!isCodeShaped(options.value)) {
    return DefaultUnknownTypeRenderer(options)
  }
  return `\`\`\`${normalizeLanguage(options.value.language)}\n${options.value.code}\n\`\`\``
}

function isCodeShaped(value: unknown): value is {code: string} {
  return typeof (value as {code?: unknown} | null)?.code === 'string'
}

/**
 * A fence info string is everything after the opening fence on the same
 * line, so a real `language` can never contain a newline, and the parser
 * only ever produces a string. Junk in this optional field should not send
 * an otherwise valid code block to the fenced-JSON path, so it is treated
 * as absent instead of guarded.
 */
function normalizeLanguage(language: unknown): string {
  if (typeof language !== 'string' || language.includes('\n')) {
    return ''
  }
  return language
}

/**
 * @public
 */
export const DefaultHorizontalRuleRenderer: PortableTextTypeRenderer = () => {
  return '---'
}

/**
 * @public
 */
export const DefaultHtmlRenderer: PortableTextTypeRenderer<{
  _type: 'html'
  html: string
}> = (options) => {
  if (!isHtmlShaped(options.value)) {
    return DefaultUnknownTypeRenderer(options)
  }
  return options.value.html
}

function isHtmlShaped(value: unknown): value is {html: string} {
  return typeof (value as {html?: unknown} | null)?.html === 'string'
}

/**
 * @public
 */
export const DefaultImageRenderer: PortableTextTypeRenderer<{
  _type: 'image'
  src: string
  alt: string | undefined
  title: string | undefined
}> = (options) => {
  if (!isImageShaped(options.value)) {
    return DefaultUnknownTypeRenderer(options)
  }
  const alt = escapeImageAndLinkText(options.value.alt ?? '')
  const title = options.value.title
    ? ` "${escapeImageAndLinkTitle(options.value.title)}"`
    : ''
  return `![${alt}](${options.value.src}${title})`
}

function isImageShaped(value: unknown): value is {
  src: string
  alt: string | null | undefined
  title: string | null | undefined
} {
  const image = value as {src?: unknown; alt?: unknown; title?: unknown} | null
  return (
    typeof image?.src === 'string' &&
    // CMS payloads commonly store cleared optional strings as `null`; the
    // render body treats `null` like absent, so the guard must too
    (image.alt == null || typeof image.alt === 'string') &&
    (image.title == null || typeof image.title === 'string')
  )
}

/**
 * A table is table-shaped when everything the renderer dereferences is
 * there: `rows` an array of typed objects with a `cells` array, every cell
 * a typed object whose `value` array holds typed objects (`renderNode`'s
 * input contract). The predicate narrows to exactly what `renderTable`
 * consumes, so the renderer needs no casts. A malformed `table` value
 * (e.g. a consumer's differently-shaped `table` type) falls back to the
 * fenced-JSON path instead of throwing.
 */
function isTableShaped(value: unknown): value is TableShaped {
  const rows = (value as {rows?: unknown} | null)?.rows
  return (
    Array.isArray(rows) &&
    rows.every(
      (row) =>
        isTypedObject(row) &&
        Array.isArray(row['cells']) &&
        row['cells'].every(
          (cell) =>
            isTypedObject(cell) &&
            Array.isArray(cell['value']) &&
            cell['value'].every(isTypedObject),
        ),
    )
  )
}

type TableShaped = {
  headerRows?: unknown
  alignment?: unknown
  rows: Array<{cells: Array<{value: Array<TypedObject>}>}>
}

/**
 * Renders a Portable Text table block-object back to Markdown.
 *
 * The PT `headerRows` field decides the header. Missing `headerRows` and
 * `headerRows === 0` both render headerless: GFM has no headerless form, so
 * an empty header row is emitted and every row goes in the body (that empty
 * header reads back as `headerRows: 0` via `markdownToPortableText`).
 * `headerRows >= 1` promotes `rows[0]` to the header. GFM allows exactly one
 * header row, so header rows beyond the first flatten into the body, lossy,
 * but the extra rows stay on the Portable Text side.
 *
 * Asymmetric tables (rows of varying cell counts) are widened to match
 * the row with the most cells. Narrower rows are padded with empty cells
 * so a GFM parser doesn't silently drop the extra cells in wider rows.
 *
 * @public
 */
export const DefaultTableRenderer: PortableTextTypeRenderer<{
  _type: 'table'
  headerRows: number | undefined
  alignment: Array<'left' | 'center' | 'right' | null> | undefined
  rows: Array<{
    _key: string
    cells: Array<{
      _key: string
      value: Array<PortableTextBlock>
    }>
  }>
}> = (options) => {
  const {value, renderNode} = options

  if (!isTableShaped(value)) {
    return DefaultUnknownTypeRenderer(options)
  }

  return renderTable(value, renderNode)
}

function renderTable(
  value: TableShaped,
  renderNode: Parameters<PortableTextTypeRenderer>[0]['renderNode'],
): string {
  const rows = value.rows
  // `alignment` is an extension field, not part of the table shape: junk
  // here should not send an otherwise valid table to the fenced-JSON path,
  // so it is normalized away instead of guarded (`{}.at` would throw below).
  const alignment: ReadonlyArray<unknown> | undefined = Array.isArray(
    value.alignment,
  )
    ? value.alignment
    : undefined

  const headerRow = rows.at(0)

  if (!headerRow) {
    return ''
  }

  // Helper to extract text from cell blocks
  const getCellText = (cellBlocks: Array<TypedObject>): string => {
    return cellBlocks
      .map((block, index) =>
        renderNode({
          node: block,
          index,
          isInline: false,
          renderNode,
        }),
      )
      .join(' ')
      .trim()
  }

  const lines: string[] = []

  // GFM requires every row to have the same number of cells as the header row
  // and the delimiter row. Parsers silently drop excess cells from body rows
  // that are wider than the header, so we widen the table to the widest row
  // and pad narrower rows with empty cells to keep all data visible.
  const columnCount = rows.reduce(
    (max, row) => Math.max(max, row.cells.length),
    0,
  )

  const renderCells = (texts: Array<string>): string => {
    const padded = [...texts]
    while (padded.length < columnCount) {
      padded.push('')
    }
    return `| ${padded.join(' | ')} |`
  }

  const renderRow = (cells: typeof headerRow.cells): string =>
    renderCells(cells.map((cell) => escapeTableCell(getCellText(cell.value))))

  // Delimiter row, sized to the column count. Each cell's colons encode the
  // column's alignment as defined by `value.alignment[columnIndex]`.
  const separators = Array.from({length: columnCount}, (_, index) => {
    const align = alignment?.at(index)
    if (align === 'left') {
      return ' :--- '
    }
    if (align === 'center') {
      return ' :---: '
    }
    if (align === 'right') {
      return ' ---: '
    }
    return ' --- '
  })
  const delimiter = `|${separators.join('|')}|`

  const hasHeader = (Number(value.headerRows) || 0) >= 1

  if (!hasHeader) {
    // Headerless table: emit an empty header row and keep every row in the
    // body.
    lines.push(renderCells([]))
    lines.push(delimiter)
    for (const row of rows) {
      lines.push(renderRow(row.cells))
    }
  } else {
    // `rows[0]` is the header. Header rows beyond the first flatten into the
    // body (GFM has a single header row).
    lines.push(renderRow(headerRow.cells))
    lines.push(delimiter)
    for (let i = 1; i < rows.length; i++) {
      const row = rows.at(i)
      if (row) {
        lines.push(renderRow(row.cells))
      }
    }
  }

  return lines.join('\n')
}

/**
 * @public
 */
export const DefaultCalloutRenderer: PortableTextTypeRenderer<{
  _type: 'callout'
  tone: string
  content: Array<PortableTextBlock>
}> = (options) => {
  if (!isCalloutShaped(options.value)) {
    return DefaultUnknownTypeRenderer(options)
  }
  const {renderNode} = options
  const renderedContent = options.value.content
    .map((block, index) =>
      renderNode({
        node: block._type === 'block' ? {...block, style: 'normal'} : block,
        index,
        isInline: false,
        renderNode,
      }),
    )
    .join('\n\n')

  const prefixed = renderedContent
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n')

  return `> [!${options.value.tone.toUpperCase()}]\n${prefixed}`
}

function isCalloutShaped(
  value: unknown,
): value is {tone: string; content: Array<TypedObject>} {
  const callout = value as {tone?: unknown; content?: unknown} | null
  return (
    typeof callout?.tone === 'string' &&
    Array.isArray(callout.content) &&
    callout.content.every(isTypedObject)
  )
}

/**
 * Renders a structural blockquote block-object (the `types.blockquote` shape
 * produced by `markdownToPortableText` when a `types.blockquote` matcher is
 * provided) back to Markdown. Each content block is rendered via the
 * recursive renderer pipeline, joined with blank lines, and every line is
 * prefixed with `> ` to form a Markdown blockquote.
 *
 * Distinct from `DefaultBlockquoteRenderer`, which renders flat-path text
 * blocks with `style: 'blockquote'`.
 *
 * @public
 */
export const DefaultBlockquoteObjectRenderer: PortableTextTypeRenderer<{
  _type: 'blockquote'
  content: Array<PortableTextBlock>
}> = ({value, renderNode}) => {
  const renderedContent = value.content
    .map((block, index) =>
      renderNode({
        node: block._type === 'block' ? {...block, style: 'normal'} : block,
        index,
        isInline: false,
        renderNode,
      }),
    )
    .join('\n\n')

  return renderedContent
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n')
}

/**
 * Renders a structural list block-object (the `types.list` shape produced by
 * `markdownToPortableText` when a `types.list` matcher is provided) back to
 * Markdown. Items render as `- ` for `kind: 'bullet'`, `1. `/`2. ` for `'number'`,
 * and `- [x] ` / `- [ ] ` for `'task'`. Items can hold any blocks - text blocks,
 * code blocks, callouts, images, and nested lists - and content other than the
 * leading text block is indented to keep it inside the item.
 *
 * @public
 */
export const DefaultListRenderer: PortableTextTypeRenderer<{
  _type: 'list'
  kind: 'bullet' | 'number' | 'task'
  items: Array<{
    _type: 'list-item'
    _key: string
    checked?: boolean
    content: Array<PortableTextBlock | TypedObject>
  }>
}> = ({value, renderNode}) => {
  // A list is "loose" when any item carries multiple non-list-block
  // content entries (a continuation paragraph, a code block, etc).
  // CommonMark uses blank lines between items in loose lists; tight lists
  // pack items together with single newlines. A nested list as a second
  // child of an item does NOT make the list loose, so we ignore those when
  // counting.
  const isLoose = value.items.some((item) => {
    const nonNestedBlocks = item.content.filter(
      (block) => (block as TypedObject)._type !== 'list',
    )
    return nonNestedBlocks.length > 1
  })
  const itemSeparator = isLoose ? '\n\n' : '\n'

  const lines = value.items.map((item, itemIndex) => {
    const marker = getListMarker(value.kind, itemIndex, item.checked)
    // Continuation indent matches the marker's width so that subsequent
    // blocks attach to this item under CommonMark's lazy-continuation rule.
    // Bullet `- ` indents to 2; ordered `1. ` indents to 3, `10. ` to 4.
    // Task `- [x] ` is conceptually `- ` + a `[x] ` content prefix at the
    // markdown-it level, so its continuation indent stays at 2.
    const indentWidth = value.kind === 'task' ? 2 : marker.length
    const indent = ' '.repeat(indentWidth)

    const renderedBlocks = item.content.map((block, blockIndex) => ({
      isNestedList: (block as TypedObject)._type === 'list',
      text: renderNode({
        node: block as TypedObject,
        index: blockIndex,
        isInline: false,
        renderNode,
      }),
    }))

    const [first, ...rest] = renderedBlocks
    // Trim trailing whitespace from empty items so `- ` becomes `-`.
    const head = `${marker}${first?.text ?? ''}`.trimEnd()
    if (rest.length === 0) {
      return head
    }

    const tail = rest
      .map((rendered) => {
        const indented = rendered.text
          .split('\n')
          .map((line) => (line === '' ? '' : `${indent}${line}`))
          .join('\n')
        // Nested lists hug the previous block (tight list); other content
        // gets a blank line separator (paragraph break).
        return rendered.isNestedList ? `\n${indented}` : `\n\n${indented}`
      })
      .join('')

    return `${head}${tail}`
  })

  return lines.join(itemSeparator)
}

function getListMarker(
  kind: 'bullet' | 'number' | 'task',
  itemIndex: number,
  checked: boolean | undefined,
): string {
  if (kind === 'number') {
    return `${itemIndex + 1}. `
  }
  if (kind === 'task') {
    return checked ? '- [x] ' : '- [ ] '
  }
  return '- '
}

/**
 * @public
 */
export const DefaultUnknownTypeRenderer: PortableTextTypeRenderer = ({
  value,
  isInline,
}) => {
  const json = `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
  // For inline unknown types, add newlines to break them out of the text flow
  return isInline ? `\n${json}\n` : json
}
