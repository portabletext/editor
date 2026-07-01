import {
  DefaultCalloutRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultTableRenderer,
  type PortableTextRenderers,
  type PortableTextTypeRenderer,
} from '@portabletext/markdown'

type Block = {_type: string; children?: Array<{_type: string; text?: string}>}

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

    'table': DefaultTableRenderer,

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
