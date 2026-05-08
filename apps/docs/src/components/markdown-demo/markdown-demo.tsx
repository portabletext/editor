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
  DefaultBlockquoteObjectRenderer,
  DefaultCalloutRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultImageRenderer,
  DefaultListRenderer,
  DefaultTableRenderer,
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {useEffect, useRef, useState} from 'react'

// Schema mirrors @portabletext/markdown's defaults so values produced by
// markdownToPortableText pass the editor's schema validation. Lists are
// declared as structural `list` block-objects (not flat `lists` items) so
// list items can hold rich nested content like code blocks and callouts.
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
  ],
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
            },
          ],
        },
      ],
    },
    {
      name: 'blockquote',
      fields: [
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
            },
            {
              type: 'code-block',
              fields: [
                {name: 'language', type: 'string'},
                {
                  name: 'lines',
                  type: 'array',
                  of: [
                    {
                      type: 'block',
                      styles: [],
                      decorators: [],
                      annotations: [],
                      inlineObjects: [],
                    },
                  ],
                },
              ],
            },
            {
              type: 'image',
              fields: [
                {name: 'src', type: 'string'},
                {name: 'alt', type: 'string'},
                {name: 'title', type: 'string'},
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'code-block',
      fields: [
        {name: 'language', type: 'string'},
        {
          name: 'lines',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [],
              decorators: [],
              annotations: [],
              inlineObjects: [],
            },
          ],
        },
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
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {name: 'checked', type: 'boolean'},
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
                    },
                    {
                      type: 'code-block',
                      fields: [
                        {name: 'language', type: 'string'},
                        {
                          name: 'lines',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              styles: [],
                              decorators: [],
                              annotations: [],
                              inlineObjects: [],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      type: 'callout',
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
                            },
                          ],
                        },
                      ],
                    },
                    {type: 'list'},
                  ],
                },
              ],
            },
          ],
        },
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

const calloutToneClassName: Record<string, string> = {
  note: 'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  tip: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  important:
    'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
  warning:
    'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  caution:
    'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

const calloutContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children, node}) => {
    const tone = (node as {tone?: string}).tone ?? 'note'
    const toneClass = calloutToneClassName[tone] ?? calloutToneClassName.note!
    return (
      <aside
        {...attributes}
        data-tone={tone}
        className={`my-3 rounded-md border-l-4 px-4 py-3 ${toneClass}`}
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

const blockquoteContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..blockquote',
  field: 'content',
  render: ({attributes, children}) => (
    <blockquote
      {...attributes}
      className="my-2 border-gray-300 border-l-4 pl-3 text-gray-600 italic dark:border-gray-600 dark:text-gray-400"
    >
      {children}
    </blockquote>
  ),
})

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre
      {...attributes}
      className="my-3 overflow-x-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-gray-700 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      {children}
    </pre>
  ),
})

const listContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..list',
  field: 'items',
  render: ({attributes, children, node}) => {
    const kind = (node as {kind?: string}).kind ?? 'bullet'
    if (kind === 'number') {
      return (
        <ol {...attributes} className="my-2 list-decimal space-y-1 pl-6">
          {children}
        </ol>
      )
    }
    return (
      <ul
        {...attributes}
        data-kind={kind}
        className={
          kind === 'task'
            ? 'my-2 list-none space-y-1 pl-2'
            : 'my-2 list-disc space-y-1 pl-6'
        }
      >
        {children}
      </ul>
    )
  },
})

const listItemContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..list.list-item',
  field: 'content',
  render: ({attributes, children, node}) => {
    const checked = (node as {checked?: boolean}).checked
    if (typeof checked === 'boolean') {
      return (
        <li {...attributes} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-1.5 flex-none"
          />
          <div
            className={checked ? 'flex-1 line-through opacity-60' : 'flex-1'}
          >
            {children}
          </div>
        </li>
      )
    }
    return <li {...attributes}>{children}</li>
  },
})

const codeBlockSpanLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..code-block.block.span',
  render: ({attributes, children}) => (
    <span {...attributes} className="font-mono">
      {children}
    </span>
  ),
})

const horizontalRuleLeaf = defineLeaf<typeof schemaDefinition>({
  scope: '$..horizontal-rule',
  render: ({attributes, children}) => (
    <div {...attributes} className="my-4">
      <div contentEditable={false}>
        <hr className="border-0 border-t border-gray-200 dark:border-gray-700" />
      </div>
      {children}
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

const markdownShortcutsProps = {
  boldDecorator: ({
    context,
  }: {
    context: {schema: {decorators: Array<{name: string}>}}
  }) => context.schema.decorators.find((d) => d.name === 'strong')?.name,
  italicDecorator: ({
    context,
  }: {
    context: {schema: {decorators: Array<{name: string}>}}
  }) => context.schema.decorators.find((d) => d.name === 'em')?.name,
  codeDecorator: ({
    context,
  }: {
    context: {schema: {decorators: Array<{name: string}>}}
  }) => context.schema.decorators.find((d) => d.name === 'code')?.name,
  strikeThroughDecorator: ({
    context,
  }: {
    context: {schema: {decorators: Array<{name: string}>}}
  }) =>
    context.schema.decorators.find((d) => d.name === 'strike-through')?.name,
  defaultStyle: ({
    context,
  }: {
    context: {schema: {styles: Array<{value?: string; name: string}>}}
  }) => context.schema.styles[0]?.value ?? context.schema.styles[0]?.name,
  headingStyle: ({
    context,
    props,
  }: {
    context: {schema: {styles: Array<{name: string}>}}
    props: {level: number}
  }) => context.schema.styles.find((s) => s.name === `h${props.level}`)?.name,
  horizontalRuleObject: ({
    context,
  }: {
    context: {schema: {blockObjects: Array<{name: string}>}}
  }) => {
    const schemaType = context.schema.blockObjects.find(
      (o) => o.name === 'horizontal-rule',
    )
    if (!schemaType) return undefined
    return {_type: schemaType.name}
  },
  linkObject: ({
    context,
    props,
  }: {
    context: {
      schema: {
        annotations: Array<{
          name: string
          fields: Array<{name: string; type: string}>
        }>
      }
    }
    props: {href: string}
  }) => {
    const schemaType = context.schema.annotations.find((a) => a.name === 'link')
    const hrefField = schemaType?.fields.find(
      (f) => f.name === 'href' && f.type === 'string',
    )
    if (!schemaType || !hrefField) return undefined
    return {_type: schemaType.name, [hrefField.name]: props.href}
  },
} as const

const markdownOptions = {
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

const kitchenSink = `# Portable Text Editor v7

Two new APIs, one new plugin, the same editor you've been using.

## Containers

In v7, nested editable structures are first-class. A callout, a code block, a list - all *containers*. Each one declares its own sub-schema, and the editor enforces it everywhere - typing, pasting, decorator toggles, drag.

> [!NOTE]
> A container's content is editable Portable Text. Toggle marks, paste rich content, drag across boundaries - it all works at every depth.

> [!TIP]
> Your existing **flat** content keeps working. Containers are opt-in.

## What you write

Two new APIs cover the entire shape: \`defineContainer\` for nodes that hold editable children, \`defineLeaf\` for nodes that own their own DOM:

\`\`\`ts
import {defineContainer} from '@portabletext/editor'

const calloutContainer = defineContainer({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children}) => (
    <aside {...attributes}>{children}</aside>
  ),
})
\`\`\`

The container says *where* in the schema it applies and *how* to render the wrapper. The editor handles selection, paste, schema enforcement, drag-and-drop.

## Lists, your call

The flat \`listItem\` + \`level\` shape from v6 still works. Pick it when your lists are simple and you'd rather not reach for containers.

When you *want* containers - because you want list items to hold a code block, or a callout, or another list - declare a \`list\` container in your schema and the editor will treat each item as a container too. This demo registers them so we can show the shape:

- A bullet item.
- A list item that holds a code block:
  \`\`\`ts
  const works = 'A code block, inside a list item'
  \`\`\`
- A list item that holds a callout:
  > [!TIP]
  > A callout, inside a list item.
- A list item that holds another list:
  - Two levels in.
    - Three levels in. Same \`defineContainer\` registration handles every depth.

And task lists, with sub-tasks:

- [x] Schema enforcement applies at every depth.
- [ ] Migrate your custom plugins.
  - [ ] Audit \`renderBlock\` callbacks.
  - [ ] Register containers where it pays off.

## Markdown round-trips

\`@portabletext/markdown\` exposes \`markdownToPortableText\` and \`portableTextToMarkdown\` and handles every shape in this document.

| Feature     | v6                    | v7                     |
| ----------- | --------------------- | ---------------------- |
| Code blocks | flat string           | container, line blocks |
| Tables      | block-object, opaque  | container, editable    |
| Callouts    | not supported         | container with tone    |
| Lists       | flat \`listItem\` field | flat *or* container    |

## Live, both ways

Type on either side. The Portable Text shape is the truth - markdown is one *serialization* of it, this editor is another.

> Blockquotes are containers in v7, so they can hold whatever the schema allows - a code block, for example:
>
> \`\`\`ts
> markdownToPortableText(input)
> // ↓
> portableTextToMarkdown(value) === input
> \`\`\`
>
> Same Portable Text. More shapes the editor can build with it.

---

![Portable Text Editor v7](https://placehold.co/600x200/0ea5e9/white?text=Portable+Text+v7)
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
          'blockquote': DefaultBlockquoteObjectRenderer,
          'callout': DefaultCalloutRenderer,
          'code-block': ({value}) => {
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
          className="font-mono text-xs p-3 outline-none bg-transparent text-gray-800 dark:text-gray-200 flex-1 min-h-[420px] resize-none"
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
              blockquoteContainer,
              codeBlockContainer,
              listContainer,
              listItemContainer,
            ]}
          />
          <LeafPlugin
            leafs={[codeBlockSpanLeaf, horizontalRuleLeaf, imageLeaf]}
          />
          <MarkdownShortcutsPlugin {...markdownShortcutsProps} />
          <ReplaceValueBridge replaceRef={replaceEditorValueRef} />
          <PortableTextEditable
            onFocus={() => {
              focused.current = 'editor'
            }}
            className="p-4 outline-none flex-1 min-h-[420px] prose prose-sm max-w-none dark:prose-invert"
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
