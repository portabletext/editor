import {
  defineContainer,
  defineLeaf,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {
  ContainerPlugin,
  EventListenerPlugin,
  LeafPlugin,
} from '@portabletext/editor/plugins'
import {
  DefaultCalloutRenderer,
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultImageRenderer,
  DefaultTableRenderer,
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {useEffect, useRef, useState} from 'react'

// Schema mirrors @portabletext/markdown's defaults so values produced by
// markdownToPortableText pass the editor's schema validation.
const schemaDefinition = defineSchema({
  block: {
    fields: [{name: 'checked', type: 'boolean'}],
  },
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
  lists: [{name: 'bullet'}, {name: 'number'}, {name: 'task'}],
  decorators: [
    {name: 'strong'},
    {name: 'em'},
    {name: 'code'},
    {name: 'strike-through'},
  ],
  annotations: [
    {
      name: 'link',
      fields: [
        {name: 'href', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
  ],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {name: 'tone', type: 'string'},
        {
          name: 'content',
          type: 'array',
          of: [
            {
              type: 'block',
              decorators: [
                {name: 'strong'},
                {name: 'em'},
                {name: 'code'},
                {name: 'strike-through'},
              ],
              styles: [{name: 'normal'}],
              annotations: [
                {
                  name: 'link',
                  fields: [
                    {name: 'href', type: 'string'},
                    {name: 'title', type: 'string'},
                  ],
                },
              ],
              lists: [],
            },
          ],
        },
      ],
    },
    {
      name: 'code',
      fields: [
        {name: 'language', type: 'string'},
        {name: 'code', type: 'string'},
      ],
    },
    {name: 'horizontal-rule'},
    {name: 'html', fields: [{name: 'html', type: 'string'}]},
    {
      name: 'image',
      fields: [
        {name: 'src', type: 'string'},
        {name: 'alt', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
    {
      name: 'table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
                      fields: [
                        {
                          name: 'value',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              decorators: [
                                {name: 'strong'},
                                {name: 'em'},
                                {name: 'code'},
                                {name: 'strike-through'},
                              ],
                              styles: [{name: 'normal'}],
                              annotations: [
                                {
                                  name: 'link',
                                  fields: [
                                    {name: 'href', type: 'string'},
                                    {name: 'title', type: 'string'},
                                  ],
                                },
                              ],
                              lists: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  inlineObjects: [
    {
      name: 'image',
      fields: [
        {name: 'src', type: 'string'},
        {name: 'alt', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
  ],
})

const tableContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table',
  field: 'rows',
  render: ({attributes, children, node}) => {
    const headerRows = (node as {headerRows?: number}).headerRows ?? 0
    return (
      <table
        {...attributes}
        data-header-rows={headerRows}
        className="my-3 border-collapse text-sm"
      >
        <tbody>{children}</tbody>
      </table>
    )
  },
})

const rowContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table.row',
  field: 'cells',
  render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
})

const cellContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..table.row.cell',
  field: 'value',
  render: ({attributes, children}) => (
    <td
      {...attributes}
      className="border border-gray-200 dark:border-gray-700 px-2 py-1 align-top"
    >
      {children}
    </td>
  ),
})

const calloutContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children, node}) => {
    const tone = (node as {tone?: string}).tone ?? 'note'
    return (
      <aside
        {...attributes}
        data-tone={tone}
        className="my-3 rounded-md border-l-4 border-sky-400 bg-sky-50 px-4 py-3 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
      >
        {children}
      </aside>
    )
  },
})

const calloutBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout.block',
  field: 'children',
  render: ({attributes, children}) => (
    <p {...attributes} className="my-1">
      {children}
    </p>
  ),
})

const codeLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..code',
  render: ({attributes, children, node}) => {
    const v = node as {code?: string; language?: string}
    return (
      <div {...attributes}>
        {children}
        <pre
          contentEditable={false}
          className="my-2 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-gray-800"
        >
          <code data-language={v.language ?? ''}>{v.code ?? ''}</code>
        </pre>
      </div>
    )
  },
})

const horizontalRuleLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..horizontal-rule',
  render: ({attributes, children}) => (
    <div {...attributes}>
      {children}
      <hr
        contentEditable={false}
        className="my-4 border-gray-200 dark:border-gray-700"
      />
    </div>
  ),
})

const imageLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..image',
  render: ({attributes, children, node, focused, selected}) => {
    const v = node as {src?: string; alt?: string; title?: string}
    return (
      <div {...attributes}>
        {children}
        <figure
          contentEditable={false}
          className={[
            'my-3 inline-flex flex-col gap-1 rounded border-2',
            selected
              ? 'border-blue-400 dark:border-blue-500'
              : 'border-gray-200 dark:border-gray-700',
            focused ? 'bg-blue-50 dark:bg-blue-900/30' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <img
            src={v.src}
            alt={v.alt ?? ''}
            title={v.title}
            className="max-w-full rounded-t object-contain"
          />
          {v.alt && (
            <figcaption className="px-2 pb-1 text-gray-500 text-xs dark:text-gray-400">
              {v.alt}
            </figcaption>
          )}
        </figure>
      </div>
    )
  },
})

const markdownOptions = {
  types: {
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
  },
} as const

const kitchenSink = `# Markdown round-trip

Edit either side. Both stay in sync through \`@portabletext/markdown\`.

## Inline marks

**Strong**, *em*, ~~strike~~, \`code\`, and [a link](https://portabletext.org).

## Blockquote

> Portable text is structured rich text. Markdown is one way to read and write it.

## Callout

> [!NOTE]
> GitHub-style alerts deserialize into a callout container. The text inside is editable PT children.

## Image

![Portable Text logo](https://portabletext.org/logo.svg)

## Lists

- Bullet item
- Another bullet

1. Ordered item
2. Another ordered

- [x] Task list, done
- [ ] Task list, todo

## Code block

\`\`\`ts
import {markdownToPortableText} from '@portabletext/markdown'

const blocks = markdownToPortableText('# Hi')
\`\`\`

## Horizontal rule

---

## Table

| Surface | Stays the same | Changes |
| --- | --- | --- |
| DOM your CSS targets today | yes | no |
| Render callbacks | yes | no |
| Plugin API | yes | no |

That's GFM, round-tripped.
`

export function MarkdownDemo() {
  const [markdown, setMarkdown] = useState(kitchenSink)
  const [initialValue] = useState<Array<PortableTextBlock>>(() =>
    markdownToPortableText(kitchenSink, markdownOptions),
  )
  const focused = useRef<'markdown' | 'editor' | null>(null)
  const [value, setValue] = useState<Array<PortableTextBlock>>(initialValue)
  const replaceEditorValueRef = useRef<
    ((blocks: Array<PortableTextBlock>) => void) | null
  >(null)

  // Markdown -> editor: when the textarea has focus, deserialize and feed.
  useEffect(() => {
    if (focused.current !== 'markdown') {
      return
    }
    const blocks = markdownToPortableText(markdown, markdownOptions)
    replaceEditorValueRef.current?.(blocks)
  }, [markdown])

  // Editor -> markdown: when the editor has focus, derive markdown from value.
  useEffect(() => {
    if (focused.current !== 'editor') {
      return
    }
    setMarkdown(
      portableTextToMarkdown(value, {
        types: {
          'callout': DefaultCalloutRenderer,
          'code': DefaultCodeBlockRenderer,
          'horizontal-rule': DefaultHorizontalRuleRenderer,
          'image': DefaultImageRenderer,
          'table': DefaultTableRenderer,
        },
      }),
    )
  }, [value])

  return (
    <div className="not-content grid md:grid-cols-2 gap-4 my-4">
      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col">
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Markdown
          </span>
        </div>
        <textarea
          value={markdown}
          onFocus={() => {
            focused.current = 'markdown'
          }}
          onChange={(e) => setMarkdown(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs p-3 outline-none bg-transparent flex-1 min-h-[420px] resize-none"
        />
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden flex flex-col">
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Portable Text Editor
          </span>
        </div>
        <EditorProvider
          initialConfig={{
            schemaDefinition,
            initialValue,
          }}
        >
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'mutation') {
                setValue(event.value ?? [])
              }
            }}
          />
          <ContainerPlugin
            containers={[
              tableContainer,
              rowContainer,
              cellContainer,
              calloutContainer,
              calloutBlockContainer,
            ]}
          />
          <LeafPlugin leafs={[codeLeaf, horizontalRuleLeaf, imageLeaf]} />
          <ReplaceValueBridge replaceRef={replaceEditorValueRef} />
          <PortableTextEditable
            onFocus={() => {
              focused.current = 'editor'
            }}
            className="p-4 outline-none flex-1 min-h-[420px] prose prose-sm max-w-none dark:prose-invert"
            renderListItem={(props) => {
              if (props.value === 'task') {
                const checked =
                  (props.block as {checked?: boolean}).checked === true
                return (
                  <span className="inline-flex items-baseline gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="translate-y-0.5"
                    />
                    <span className={checked ? 'line-through opacity-70' : ''}>
                      {props.children}
                    </span>
                  </span>
                )
              }
              return props.children
            }}
            renderStyle={(props) => {
              if (props.value === 'h1') {
                return (
                  <h1 className="mb-2 font-bold text-2xl">{props.children}</h1>
                )
              }
              if (props.value === 'h2') {
                return (
                  <h2 className="mb-2 font-bold text-xl">{props.children}</h2>
                )
              }
              if (props.value === 'h3') {
                return (
                  <h3 className="mb-2 font-bold text-lg">{props.children}</h3>
                )
              }
              if (props.value === 'blockquote') {
                return (
                  <blockquote className="my-2 pl-3 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-600 dark:text-gray-400">
                    {props.children}
                  </blockquote>
                )
              }
              return <p className="mb-2">{props.children}</p>
            }}
            renderDecorator={(props) => {
              if (props.value === 'strong') {
                return <strong>{props.children}</strong>
              }
              if (props.value === 'em') {
                return <em>{props.children}</em>
              }
              if (props.value === 'code') {
                return (
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    {props.children}
                  </code>
                )
              }
              if (props.value === 'strike-through') {
                return <s>{props.children}</s>
              }
              return props.children
            }}
            renderAnnotation={(props) => {
              if (props.schemaType.name === 'link') {
                const href = (props.value as {href?: string}).href
                return (
                  <a
                    href={href}
                    className="text-blue-700 dark:text-blue-400 underline"
                  >
                    {props.children}
                  </a>
                )
              }
              return props.children
            }}
            renderPlaceholder={() => (
              <span className="text-gray-400 dark:text-gray-500">
                Type some markdown
              </span>
            )}
          />
        </EditorProvider>
      </div>
    </div>
  )
}

function ReplaceValueBridge({
  replaceRef,
}: {
  replaceRef: React.MutableRefObject<
    ((blocks: Array<PortableTextBlock>) => void) | null
  >
}) {
  const editor = useEditor()
  useEffect(() => {
    replaceRef.current = (blocks) => {
      editor.send({type: 'update value', value: blocks})
    }
    return () => {
      replaceRef.current = null
    }
  }, [editor, replaceRef])
  return null
}
