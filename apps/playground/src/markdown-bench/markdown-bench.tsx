import '@portabletext/plugin-table/ui/styles.css'
import '../editor.css'
import {
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {
  EditorRefPlugin,
  EventListenerPlugin,
  NodePlugin,
} from '@portabletext/editor/plugins'
import {
  markdownToPortableText,
  portableTextToMarkdown,
} from '@portabletext/markdown'
import {ListIndexProvider} from '@portabletext/plugin-list-index'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import {compileSchema} from '@portabletext/schema'
import {useEffect, useMemo, useRef, useState} from 'react'
import {createKeyGenerator} from '../key-generator'
import {PageNav} from '../page-nav'
import {
  buildEditorNodes,
  markdownShortcutsProps,
  renderPlaceholder,
} from './editor-nodes'
import {
  buildToMarkdownOptions,
  buildToPortableTextOptions,
  emptyCodeOptions,
  errorMessage,
  evaluateOptionsSource,
  type CompiledCodeOptions,
} from './options'
import {loadPersistedState, savePersistedState} from './persistence'
import {
  defaultFeatures,
  featureLabels,
  buildSchemaDefinition,
  type MarkdownBenchFeatures,
} from './schema'
import seedMarkdown from './seed.md?raw'
import {defaultSnippet, optionsSnippets} from './snippets'

/**
 * The parsed value and any parse error for one `(features, htmlInlineMode,
 * code, markdown)` combination.
 */
function computeEditorInit(args: {
  features: MarkdownBenchFeatures
  htmlInlineMode: 'skip' | 'text'
  code: CompiledCodeOptions
  markdown: string
}): {blocks: Array<PortableTextBlock>; error: string | null} {
  try {
    const schema = compileSchema(
      buildSchemaDefinition(args.features, args.code.schemaTypes?.blockObjects),
    )
    const options = buildToPortableTextOptions({
      schema,
      htmlInlineMode: args.htmlInlineMode,
      code: args.code,
    })
    return {blocks: markdownToPortableText(args.markdown, options), error: null}
  } catch (err) {
    return {blocks: [], error: errorMessage(err)}
  }
}

export function MarkdownBench() {
  const [persisted] = useState(() => loadPersistedState())
  const initial = useMemo(() => {
    const initialMarkdown = persisted?.markdown ?? seedMarkdown
    const initialFeatures = persisted?.features ?? defaultFeatures
    const initialHtmlInlineMode = persisted?.htmlInlineMode ?? 'skip'
    const initialCodeSource = persisted?.codeSource ?? defaultSnippet.source
    return {
      initialMarkdown,
      initialFeatures,
      initialHtmlInlineMode,
      initialCodeSource,
    }
  }, [persisted])

  const [markdown, setMarkdown] = useState(initial.initialMarkdown)
  const [features, setFeatures] = useState(initial.initialFeatures)
  const [htmlInlineMode, setHtmlInlineMode] = useState(
    initial.initialHtmlInlineMode,
  )
  const [codeSource, setCodeSource] = useState(initial.initialCodeSource)
  const [compiledCode, setCompiledCode] = useState<CompiledCodeOptions>(() => {
    try {
      return evaluateOptionsSource(initial.initialCodeSource)
    } catch {
      return emptyCodeOptions
    }
  })
  // Every path that changes conversion options (a schema toggle, the inline
  // HTML mode, an options-pane apply, reset) bumps this alongside the state
  // it derives from: the focus gate and the handlers below assume the
  // options in scope and the mounted editor instance always swap together.
  const [editorGeneration, setEditorGeneration] = useState(0)
  const [editorInit, setEditorInit] = useState(() =>
    computeEditorInit({
      features: initial.initialFeatures,
      htmlInlineMode: initial.initialHtmlInlineMode,
      code: compiledCode,
      markdown: initial.initialMarkdown,
    }),
  )
  const [error, setError] = useState<string | null>(editorInit.error)

  const focused = useRef<'editor' | 'markdown' | null>(null)
  const editorRef = useRef<Editor | null>(null)

  const definition = useMemo(
    () =>
      buildSchemaDefinition(features, compiledCode.schemaTypes?.blockObjects),
    [features, compiledCode],
  )
  const schema = useMemo(() => compileSchema(definition), [definition])
  const {nodes, tablePlugin: TablePlugin} = useMemo(
    () => buildEditorNodes(features),
    [features],
  )

  const toPortableTextOptions = useMemo(
    () =>
      buildToPortableTextOptions({schema, htmlInlineMode, code: compiledCode}),
    [schema, htmlInlineMode, compiledCode],
  )
  const toMarkdownOptions = useMemo(
    () => buildToMarkdownOptions(compiledCode),
    [compiledCode],
  )

  const editorKey = String(editorGeneration)
  const [editorKeyGenerator] = useState(() =>
    createKeyGenerator('markdown-bench-editor'),
  )

  useEffect(() => {
    savePersistedState({markdown, codeSource, features, htmlInlineMode})
  }, [markdown, codeSource, features, htmlInlineMode])

  function syncMarkdownFromEditorValue(value: Array<PortableTextBlock>) {
    try {
      setMarkdown(portableTextToMarkdown(value, toMarkdownOptions))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function handleMarkdownChange(text: string) {
    setMarkdown(text)
    if (focused.current !== 'markdown') {
      return
    }
    try {
      const blocks = markdownToPortableText(text, toPortableTextOptions)
      editorRef.current?.send({type: 'update value', value: blocks})
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function handleEditorMutation(nextValue: Array<PortableTextBlock>) {
    // `update value` (the markdown pane's own writes back to the editor)
    // emits no `mutation`, so this only ever fires for a real edit; dropping
    // it while the textarea is the active writer is the only guard needed.
    if (focused.current === 'markdown') {
      return
    }
    syncMarkdownFromEditorValue(nextValue)
  }

  function handleFeaturesChange(nextFeatures: MarkdownBenchFeatures) {
    const result = computeEditorInit({
      features: nextFeatures,
      htmlInlineMode,
      code: compiledCode,
      markdown,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    focused.current = null
    setFeatures(nextFeatures)
    setEditorInit(result)
    setError(null)
    setEditorGeneration((generation) => generation + 1)
  }

  function handleHtmlInlineChange(nextMode: 'skip' | 'text') {
    const result = computeEditorInit({
      features,
      htmlInlineMode: nextMode,
      code: compiledCode,
      markdown,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    focused.current = null
    setHtmlInlineMode(nextMode)
    setEditorInit(result)
    setError(null)
    setEditorGeneration((generation) => generation + 1)
  }

  function applyOptionsSource() {
    let compiled: CompiledCodeOptions
    try {
      compiled = evaluateOptionsSource(codeSource)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    const result = computeEditorInit({
      features,
      htmlInlineMode,
      code: compiled,
      markdown,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    focused.current = null
    setCompiledCode(compiled)
    setEditorInit(result)
    setError(null)
    setEditorGeneration((generation) => generation + 1)
  }

  function handleReset() {
    const result = computeEditorInit({
      features: defaultFeatures,
      htmlInlineMode: 'skip',
      code: emptyCodeOptions,
      markdown: seedMarkdown,
    })
    if (result.error) {
      setError(result.error)
      return
    }
    focused.current = null
    setMarkdown(seedMarkdown)
    setFeatures(defaultFeatures)
    setHtmlInlineMode('skip')
    setCodeSource(defaultSnippet.source)
    setCompiledCode(emptyCodeOptions)
    setEditorInit(result)
    setError(null)
    setEditorGeneration((generation) => generation + 1)
  }

  return (
    <>
      <header className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <PageNav />
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Reset
        </button>
      </header>
      <main className="flex-1 flex flex-col min-h-0 min-w-0 gap-3 px-3 py-4 md:px-4">
        <ErrorStrip message={error} />
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 lg:grid-cols-[2fr_2fr_1fr]">
          <section className="min-h-0 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            <EditorProvider
              key={editorKey}
              initialConfig={{
                schemaDefinition: definition,
                initialValue: editorInit.blocks,
                keyGenerator: editorKeyGenerator,
              }}
            >
              <EventListenerPlugin
                on={(event) => {
                  if (event.type === 'mutation') {
                    handleEditorMutation(event.value ?? [])
                  }
                }}
              />
              <NodePlugin nodes={nodes} />
              {TablePlugin ? <TablePlugin /> : null}
              <MarkdownShortcutsPlugin {...markdownShortcutsProps} />
              <EditorRefPlugin ref={editorRef} />
              <ListIndexProvider>
                <PortableTextEditable
                  onFocus={() => {
                    focused.current = 'editor'
                  }}
                  renderPlaceholder={renderPlaceholder}
                  className="prose prose-sm dark:prose-invert h-full max-w-none px-3 py-2 outline-none"
                />
              </ListIndexProvider>
            </EditorProvider>
          </section>
          <section className="min-h-0 rounded-md border border-gray-200 dark:border-gray-700">
            <textarea
              value={markdown}
              spellCheck={false}
              onFocus={() => {
                // Mutations are debounced (up to a 1s flush) and dropped
                // while this textarea is focused, so an edit typed into the
                // editor and not yet flushed would otherwise be silently
                // lost the moment focus lands here. `getSnapshot().context`
                // is the engine's live, synchronously-updated value (ahead
                // of the debounced mutation batch); read it and hand it off
                // to the markdown pane before flipping the gate.
                const value = editorRef.current?.getSnapshot().context.value
                if (value) {
                  syncMarkdownFromEditorValue(value)
                }
                focused.current = 'markdown'
              }}
              onChange={(event) => handleMarkdownChange(event.target.value)}
              className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs text-gray-800 outline-none dark:text-gray-200"
            />
          </section>
          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            <SchemaToggles
              features={features}
              onChange={handleFeaturesChange}
            />
            <HtmlInlineToggle
              value={htmlInlineMode}
              onChange={handleHtmlInlineChange}
            />
            <OptionsPane
              source={codeSource}
              onChange={setCodeSource}
              onApply={applyOptionsSource}
            />
          </aside>
        </div>
      </main>
    </>
  )
}

function ErrorStrip(props: {message: string | null}) {
  if (!props.message) {
    return null
  }
  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
      {props.message}
    </div>
  )
}

function SchemaToggles(props: {
  features: MarkdownBenchFeatures
  onChange: (features: MarkdownBenchFeatures) => void
}) {
  const names = Object.keys(props.features) as Array<
    keyof MarkdownBenchFeatures
  >
  return (
    <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Schema features
      </h2>
      <div className="flex flex-col gap-1">
        {names.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={props.features[name]}
              onChange={(event) =>
                props.onChange({
                  ...props.features,
                  [name]: event.target.checked,
                })
              }
            />
            {featureLabels[name]}
          </label>
        ))}
      </div>
    </div>
  )
}

function HtmlInlineToggle(props: {
  value: 'skip' | 'text'
  onChange: (value: 'skip' | 'text') => void
}) {
  return (
    <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Inline HTML
      </h2>
      <div className="flex gap-1">
        {(['skip', 'text'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => props.onChange(mode)}
            className={
              props.value === mode
                ? 'rounded-md bg-gray-800 px-2 py-1 text-xs text-white dark:bg-gray-200 dark:text-gray-900'
                : 'rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}

function OptionsPane(props: {
  source: string
  onChange: (source: string) => void
  onApply: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Options
        </h2>
        <select
          value=""
          onChange={(event) => {
            const snippet = optionsSnippets.find(
              (candidate) => candidate.id === event.target.value,
            )
            if (snippet) {
              props.onChange(snippet.source)
            }
          }}
          className="rounded-md border border-gray-200 bg-transparent px-1 py-0.5 text-xs dark:border-gray-700"
        >
          <option value="" disabled>
            Load snippet…
          </option>
          {optionsSnippets.map((snippet) => (
            <option key={snippet.id} value={snippet.id}>
              {snippet.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={props.source}
        spellCheck={false}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            props.onApply()
          }
        }}
        className="min-h-40 flex-1 resize-none rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      />
      <button
        type="button"
        onClick={props.onApply}
        className="mt-2 self-start rounded-md bg-gray-800 px-2 py-1 text-xs text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300"
      >
        Apply (⌘/Ctrl+Enter)
      </button>
    </div>
  )
}
