import type {PortableTextRenderers} from '@portabletext/markdown'

export const markdownOptions: Partial<PortableTextRenderers> = {
  types: {
    'break': () => '\n---\n',
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
  },
  marks: {
    subscript: ({children}) => `<sub>${children}</sub>`,
    superscript: ({children}) => `<sup>${children}</sup>`,
    comment: ({children}) => children,
  },
}
