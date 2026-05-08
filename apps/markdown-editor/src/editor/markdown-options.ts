import {
  DefaultBlockquoteObjectRenderer,
  DefaultCalloutRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultImageRenderer,
  DefaultListRenderer,
  DefaultTableRenderer,
  type PortableTextRenderers,
} from '@portabletext/markdown'

export const markdownToPortableTextOptions = {
  types: {
    // md → pt: split fenced code into one text block per line, mirroring
    // playground's plugin.markdown-deserializer.tsx.
    code: ({
      context,
      value,
      isInline,
    }: {
      context: {keyGenerator: () => string}
      value: {language: string | undefined; code: string}
      isInline: boolean
    }) => {
      if (isInline) {
        return undefined
      }
      const sourceLines = (value.code ?? '').split('\n')
      // markdown-it always emits a trailing empty line for fenced blocks.
      if (
        sourceLines.length > 0 &&
        sourceLines[sourceLines.length - 1] === ''
      ) {
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
      return {
        _type: 'code-block',
        _key: context.keyGenerator(),
        language: value.language,
        lines,
      }
    },
    table: ({
      context,
      value,
    }: {
      context: {keyGenerator: () => string}
      value: {
        headerRows: number | undefined
        rows: Array<{_key: string; _type: 'row'; cells: unknown[]}>
      }
    }) => ({
      _key: context.keyGenerator(),
      _type: 'table',
      headerRows: value.headerRows,
      rows: value.rows,
    }),
    list: ({
      context,
      value,
    }: {
      context: {keyGenerator: () => string}
      value: {
        kind: 'bullet' | 'number' | 'task'
        items: Array<unknown>
      }
    }) => ({
      _key: context.keyGenerator(),
      _type: 'list',
      kind: value.kind,
      items: value.items,
    }),
    blockquote: ({
      context,
      value,
    }: {
      context: {keyGenerator: () => string}
      value: {content: Array<unknown>}
    }) => ({
      _key: context.keyGenerator(),
      _type: 'blockquote',
      content: value.content,
    }),
  },
} as const

export const portableTextToMarkdownTypes: NonNullable<
  PortableTextRenderers['types']
> = {
  'blockquote': DefaultBlockquoteObjectRenderer,
  'callout': DefaultCalloutRenderer,
  'code-block': ({value}: {value: unknown}) => {
    const v = value as {
      language?: string
      lines?: Array<{
        children?: Array<{_type: string; text?: string}>
      }>
    }
    const code = (v.lines ?? [])
      .map((line) =>
        (line.children ?? [])
          .map((c) => (c._type === 'span' ? (c.text ?? '') : ''))
          .join(''),
      )
      .join('\n')
    return `\`\`\`${v.language ?? ''}\n${code}\n\`\`\``
  },
  'horizontal-rule': DefaultHorizontalRuleRenderer,
  'image': DefaultImageRenderer,
  'list': DefaultListRenderer,
  'table': DefaultTableRenderer,
}
