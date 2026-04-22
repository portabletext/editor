import {
  DefaultCalloutRenderer,
  DefaultHorizontalRuleRenderer,
  type PortableTextRenderers,
  type PortableTextTypeRenderer,
} from '@portabletext/markdown'

type Block = {_type: string; children?: Array<{_type: string; text?: string}>}
type Cell = {_type: 'cell'; content: Array<Block>}
type Row = {_type: 'row'; cells: Array<Cell>}

export const markdownOptions: Partial<PortableTextRenderers> = {
  types: {
    'break': DefaultHorizontalRuleRenderer,

    'image': ({value}: {value: {src?: string; alt?: string}}) => {
      const alt = value.alt || ''
      const src = value.src || ''
      return `![${alt}](${src})`
    },

    'stock-ticker': ({value}: {value: {symbol?: string}}) => {
      return `[$${value.symbol || ''}]`
    },

    'mention': ({value}: {value: {username?: string; name?: string}}) => {
      return `@${value.username || value.name || ''}`
    },

    // Adapter from playground's `{lines: [...text blocks]}` shape to a
    // standard fenced code block. Reads span text directly so the output
    // doesn't pick up list/style formatting from the inner blocks.
    'code-block': ({value}: {value: {lines?: Array<Block>}}) => {
      const lines = value.lines ?? []
      const code = lines
        .map((line) =>
          (line.children ?? [])
            .map((child) => (child._type === 'span' ? (child.text ?? '') : ''))
            .join(''),
        )
        .join('\n')
      return `\`\`\`\n${code}\n\`\`\``
    },

    'callout': DefaultCalloutRenderer,

    // Adapter from playground's `cell.content` shape to the package's
    // built-in table renderer (which expects `cell.value`). Collapses
    // each cell to a single line of inline-rendered text since markdown
    // tables do not support multi-line cells.
    'table': (({value, renderNode}) => {
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
              node: block,
              index,
              isInline: false,
              renderNode,
            }),
          )
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
      const lines: Array<string> = []
      for (let i = 0; i < headerRows; i++) {
        const row = rows[i]
        if (!row) {
          continue
        }
        lines.push(`| ${row.cells.map(renderCell).join(' | ')} |`)
      }
      if (headerRows > 0) {
        const sep = rows[0]!.cells.map(() => ' --- ').join('|')
        lines.push(`|${sep}|`)
      }
      for (let i = headerRows; i < rows.length; i++) {
        const row = rows[i]
        if (!row) {
          continue
        }
        lines.push(`| ${row.cells.map(renderCell).join(' | ')} |`)
      }
      return lines.join('\n')
    }) satisfies PortableTextTypeRenderer,

    // No native markdown for fact-box. Render inner content as a
    // collapsible `<details>` block so the preview still surfaces the
    // content without inventing syntax.
    'fact-box': (({value, renderNode}) => {
      const factBoxValue = value as {content?: Array<Block>}
      const content = factBoxValue.content ?? []
      const inner = content
        .map((block, index) =>
          renderNode({
            node: block,
            index,
            isInline: false,
            renderNode,
          }),
        )
        .join('\n\n')
      return `<details>\n<summary>Fact box</summary>\n\n${inner}\n\n</details>`
    }) satisfies PortableTextTypeRenderer,
  },
  marks: {
    subscript: ({children}) => `<sub>${children}</sub>`,
    superscript: ({children}) => `<sup>${children}</sup>`,
    underline: ({children}) => `<u>${children}</u>`,
    comment: ({children}) => children,
  },
}
