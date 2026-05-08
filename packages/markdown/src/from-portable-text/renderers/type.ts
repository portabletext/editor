import type {PortableTextBlock, TypedObject} from '@portabletext/types'
import {escapeImageAndLinkText, escapeImageAndLinkTitle} from '../../escape'
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
  const headerRows = value.headerRows || 0
  const rows = value.rows as Array<{
    _key: string
    _type: 'row'
    cells: Array<{
      _type: 'cell'
      _key: string
      value: Array<{_type: string; children?: Array<unknown>}>
    }>
  }>
  const lines: string[] = []

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

  // Add header rows
  for (let i = 0; i < headerRows; i++) {
    const row = rows[i]
    if (row) {
      const cellTexts = row.cells.map((cell) => getCellText(cell.value))
      lines.push(`| ${cellTexts.join(' | ')} |`)
    }
  }

  // Add separator line if there are headers
  if (headerRows > 0 && rows[0]) {
    const separators = rows[0].cells.map(() => ' --- ')
    lines.push(`|${separators.join('|')}|`)
  }

  // Add body rows
  for (let i = headerRows; i < rows.length; i++) {
    const row = rows[i]
    if (row) {
      const cellTexts = row.cells.map((cell) => getCellText(cell.value))
      lines.push(`| ${cellTexts.join(' | ')} |`)
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
  const indent = '  '
  const lines = value.items.map((item, itemIndex) => {
    const marker = getListMarker(value.kind, itemIndex, item.checked)
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
    const head = `${marker}${first?.text ?? ''}`
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

  return lines.join('\n')
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
