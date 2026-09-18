import {
  DefaultHorizontalRuleRenderer,
  type PortableTextRenderers,
  type PortableTextTypeRenderer,
} from '@portabletext/markdown'

type Block = {_type: string; children?: Array<{_type: string; text?: string}>}

export const markdownOptions: Partial<PortableTextRenderers> = {
  types: {
    'horizontal-rule': DefaultHorizontalRuleRenderer,

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
