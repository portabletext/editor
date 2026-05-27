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
}> = ({value}) => {
  return `\`\`\`${value.language ?? ''}\n${value.code}\n\`\`\``
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
}> = ({value}) => {
  return value.html
}

/**
 * @public
 */
export const DefaultImageRenderer: PortableTextTypeRenderer<{
  _type: 'image'
  src: string
  alt: string | undefined
  title: string | undefined
}> = ({value}) => {
  const alt = escapeImageAndLinkText(value.alt ?? '')
  const title = value.title ? ` "${escapeImageAndLinkTitle(value.title)}"` : ''
  return `![${alt}](${value.src}${title})`
}

/**
 * Renders a Portable Text table block-object back to Markdown. Because
 * GFM allows exactly one header row, the first row is always emitted as
 * the header, followed by the delimiter row, followed by the remaining
 * rows as body rows. The PT `headerRows` field is informational on the
 * Portable Text side and is ignored on the way out so that the emitted
 * Markdown is always a valid GFM table.
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
  rows: Array<{
    _key: string
    cells: Array<{
      _key: string
      value: Array<PortableTextBlock>
    }>
  }>
}> = ({value, renderNode}) => {
  const rows = value.rows as Array<{
    _key: string
    _type: 'row'
    cells: Array<{
      _type: 'cell'
      _key: string
      value: Array<{_type: string; children?: Array<unknown>}>
    }>
  }>

  const headerRow = rows.at(0)

  if (!headerRow) {
    return ''
  }

  // Helper to extract text from cell blocks
  const getCellText = (
    cellBlocks: Array<{_type: string; children?: Array<unknown>}>,
  ): string => {
    return cellBlocks
      .map((block, index) =>
        renderNode({
          node: block as {_type: string},
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

  const renderRow = (cells: typeof headerRow.cells): string => {
    const texts = cells.map((cell) => escapeTableCell(getCellText(cell.value)))
    while (texts.length < columnCount) {
      texts.push('')
    }
    return `| ${texts.join(' | ')} |`
  }

  // First row is the header, padded to the table's column count
  lines.push(renderRow(headerRow.cells))

  // Delimiter row, sized to the column count
  const separators = Array.from({length: columnCount}, () => ' --- ')
  lines.push(`|${separators.join('|')}|`)

  // Remaining rows are the body
  for (let i = 1; i < rows.length; i++) {
    const row = rows.at(i)
    if (row) {
      lines.push(renderRow(row.cells))
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
}> = ({value, renderNode}) => {
  const renderedContent = value.content
    .map((block, index) =>
      renderNode({
        node: {...block, style: 'normal'},
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

  return `> [!${value.tone.toUpperCase()}]\n${prefixed}`
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
        node: {...block, style: 'normal'},
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
