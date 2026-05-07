import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type BlockRenderProps,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
import {
  DefaultCodeBlockRenderer,
  DefaultHorizontalRuleRenderer,
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
        {name: 'content', type: 'array'},
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
        {name: 'rows', type: 'array'},
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

const kitchenSink = `# Markdown round-trip

Edit either side. Both stay in sync through \`@portabletext/markdown\`.

## Inline marks

**Strong**, *em*, ~~strike~~, \`code\`, and [a link](https://portabletext.org).

## Blockquote

> Portable text is structured rich text. Markdown is one way to read and write it.

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

That's GFM, round-tripped.
`

export function MarkdownDemo() {
  const [markdown, setMarkdown] = useState(kitchenSink)
  const [initialValue] = useState<Array<PortableTextBlock>>(() =>
    markdownToPortableText(kitchenSink),
  )
  const focused = useRef<'markdown' | 'editor' | null>(null)
  const [value, setValue] = useState<Array<PortableTextBlock>>(initialValue)
  const replaceEditorValueRef = useRef<
    ((blocks: Array<PortableTextBlock>) => void) | null
  >(null)

  // Markdown -> editor: when the textarea has focus, deserialize and feed.
  useEffect(() => {
    if (focused.current !== 'markdown') return
    const blocks = markdownToPortableText(markdown)
    replaceEditorValueRef.current?.(blocks)
  }, [markdown])

  // Editor -> markdown: when the editor has focus, derive markdown from value.
  useEffect(() => {
    if (focused.current !== 'editor') return
    setMarkdown(
      portableTextToMarkdown(value, {
        types: {
          'code': DefaultCodeBlockRenderer,
          'horizontal-rule': DefaultHorizontalRuleRenderer,
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
          <ReplaceValueBridge replaceRef={replaceEditorValueRef} />
          <PortableTextEditable
            onFocus={() => {
              focused.current = 'editor'
            }}
            className="p-4 outline-none flex-1 min-h-[420px] prose prose-sm max-w-none dark:prose-invert"
            renderBlock={(props: BlockRenderProps) => {
              if (props.schemaType.name === 'code') {
                const v = props.value as {code?: string}
                return (
                  <pre className="my-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs overflow-x-auto">
                    <code>{v.code}</code>
                  </pre>
                )
              }
              if (props.schemaType.name === 'horizontal-rule') {
                return (
                  <hr className="my-4 border-gray-200 dark:border-gray-700" />
                )
              }
              return props.children
            }}
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
              if (props.value === 'strong')
                return <strong>{props.children}</strong>
              if (props.value === 'em') return <em>{props.children}</em>
              if (props.value === 'code') {
                return (
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    {props.children}
                  </code>
                )
              }
              if (props.value === 'strike-through')
                return <s>{props.children}</s>
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
