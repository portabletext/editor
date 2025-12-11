import type {PortableTextBlock} from '@portabletext/types'
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
export const DefaultUnknownTypeRenderer: PortableTextTypeRenderer = ({
  value,
  isInline,
}) => {
  const json = `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
  // For inline unknown types, add newlines to break them out of the text flow
  return isInline ? `\n${json}\n` : json
}
