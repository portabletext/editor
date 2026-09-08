type OptionsSnippet = {
  id: string
  label: string
  source: string
}

const noneSource = `// Contract: return {toPortableText?, toMarkdown?, schemaTypes?}.
// - toPortableText merges into markdownToPortableText's options: schema,
//   html, and matchers for marks/block/listItem/types. The schema and html
//   keys are owned by the toggles above: overriding them here changes
//   parsing only, the editor pane will not follow.
// - toMarkdown merges into portableTextToMarkdown's options: renderers for
//   types/marks/block.
// - schemaTypes.blockObjects adds block-object definitions to the schema
//   both panes compile, for output that uses types the toggle-derived
//   schema doesn't declare.
// Either half may be omitted. Whatever a key sets here wins over the
// schema-toggle-derived options for that key.
({})
`

const playgroundTypesSource = `// Adapters for the main playground's block shapes, which differ from this
// bench's default schema. Modeled on previews/markdown-options.ts.
({
  toMarkdown: {
    types: {
      // The main playground's code block holds one text block per line
      // ({lines: [...]}) rather than a single \`code\` string. Reads span
      // text directly so the output doesn't pick up list/style formatting
      // from the inner blocks.
      'code-block': ({value}) => {
        const lines = value.lines ?? []
        const code = lines
          .map((line) =>
            (line.children ?? [])
              .map((child) => (child._type === 'span' ? (child.text ?? '') : ''))
              .join(''),
          )
          .join('\\n')
        const fence = '\`\`\`'
        return fence + '\\n' + code + '\\n' + fence
      },
      // The main playground names its horizontal rule object \`break\`; this
      // bench's default schema names it \`horizontal-rule\` (already handled
      // by the default renderer without an override).
      break: helpers.DefaultHorizontalRuleRenderer,
    },
  },
})
`

const structuralContainersSource = `// Diverts lists and blockquotes into structural block-objects (explicit
// \`items\`/\`content\` arrays) instead of the default flat
// listItem/level/style fields. See the \`types.list\`/\`types.blockquote\`
// options in markdown-to-portable-text.ts. The toggle-derived schema
// doesn't declare \`list\`/\`blockquote\` block objects, so this snippet
// ships them via schemaTypes, merged into both panes' schema.
({
  toPortableText: {
    types: {
      list: ({context, value}) => ({
        _key: context.keyGenerator(),
        _type: 'list',
        kind: value.kind,
        items: value.items,
      }),
      blockquote: ({context, value}) => ({
        _key: context.keyGenerator(),
        _type: 'blockquote',
        content: value.content,
      }),
    },
  },
  toMarkdown: {
    types: {
      list: helpers.DefaultListRenderer,
      blockquote: helpers.DefaultBlockquoteObjectRenderer,
    },
  },
  schemaTypes: {
    blockObjects: [
      {
        name: 'list',
        fields: [
          {name: 'kind', type: 'string'},
          {name: 'items', type: 'array'},
        ],
      },
      {
        name: 'blockquote',
        fields: [{name: 'content', type: 'array'}],
      },
    ],
  },
})
`

export const optionsSnippets: Array<OptionsSnippet> = [
  {id: 'none', label: 'None', source: noneSource},
  {
    id: 'playground-types',
    label: 'Playground types',
    source: playgroundTypesSource,
  },
  {
    id: 'structural-containers',
    label: 'Structural containers',
    source: structuralContainersSource,
  },
]

export const defaultSnippet = optionsSnippets[0]!
