import type {PortableTextBlock} from '@portabletext/editor'
import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {useEffect, useRef, useState} from 'react'
import {PortableTextSurface} from './editor/editor'
import {
  markdownToPortableTextOptions,
  portableTextToMarkdownTypes,
} from './editor/markdown-options'
import kitchenSinkSource from './kitchen-sink.md?raw'

export function App() {
  const [markdown, setMarkdown] = useState<string>(kitchenSinkSource)
  const [initialValue] = useState<Array<PortableTextBlock>>(() =>
    markdownToPortableText(kitchenSinkSource, markdownToPortableTextOptions),
  )
  const [value, setValue] = useState<Array<PortableTextBlock>>(initialValue)
  const focused = useRef<'markdown' | 'editor' | null>(null)
  const replaceEditorValueRef = useRef<
    ((blocks: Array<PortableTextBlock>) => void) | null
  >(null)

  // Markdown -> editor: when the textarea has focus, deserialize and feed.
  useEffect(() => {
    if (focused.current !== 'markdown') {
      return
    }
    const blocks = markdownToPortableText(
      markdown,
      markdownToPortableTextOptions,
    )
    replaceEditorValueRef.current?.(blocks)
  }, [markdown])

  // Editor -> markdown: when the editor has focus, derive markdown from value.
  useEffect(() => {
    if (focused.current !== 'editor') {
      return
    }
    setMarkdown(
      portableTextToMarkdown(value, {types: portableTextToMarkdownTypes}),
    )
  }, [value])

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 p-2">
      <Pane label="Portable Text Editor" tone="primary">
        <PortableTextSurface
          initialValue={initialValue}
          onMutation={setValue}
          onFocus={() => {
            focused.current = 'editor'
          }}
          replaceValueRef={replaceEditorValueRef}
        />
      </Pane>
      <div className="grid grid-rows-2 gap-2 min-h-0">
        <Pane label="Portable Text (JSON)">
          <pre
            className="h-full overflow-auto p-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre"
            data-pane="pt-json"
          >
            {JSON.stringify(value, null, 2)}
          </pre>
        </Pane>
        <Pane label="Markdown">
          <textarea
            value={markdown}
            onFocus={() => {
              focused.current = 'markdown'
            }}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs text-gray-800 outline-none dark:text-gray-200"
          />
        </Pane>
      </div>
    </div>
  )
}

function Pane({
  label,
  tone,
  children,
}: {
  label: string
  tone?: 'primary'
  children: React.ReactNode
}) {
  return (
    <section
      className={[
        'flex min-h-0 flex-col overflow-hidden rounded-md border',
        tone === 'primary'
          ? 'border-gray-300 dark:border-gray-700'
          : 'border-gray-200 dark:border-gray-800',
      ].join(' ')}
    >
      <header className="border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
        <span className="font-medium text-gray-500 text-xs uppercase tracking-wide dark:text-gray-400">
          {label}
        </span>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </section>
  )
}
