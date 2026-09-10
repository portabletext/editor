import type {
  Editor,
  EditorSchema,
  PortableTextBlock,
} from '@portabletext/editor'
import {applyMarkdownEdit, portableTextToMarkdown} from '@portabletext/markdown'
import {useCallback, useMemo, useReducer, useRef} from 'react'
import {isDeepEqual} from 'remeda'
import {createKeyGenerator} from '../key-generator'
import {ErrorBoundary} from '../primitives/error-boundary'
import {ErrorScreen} from '../primitives/error-screen'
import {MarkdownEditRejected} from './degradation-error'
import {DocumentPane} from './document-pane'
import {computeKeyDelta} from './key-delta'
import {initialMarkdownLoopState, markdownLoopReducer} from './loop-state'
import {MarkdownPane} from './markdown-pane'
import {PortableTextPane} from './portable-text-pane'
import {createMarkdownLoopSeed} from './seed'

export function MarkdownLoopPage() {
  const editorRef = useRef<Editor | null>(null)
  const schemaRef = useRef<EditorSchema | null>(null)
  const seed = useMemo(() => createMarkdownLoopSeed(), [])
  const keyGenerator = useMemo(() => createKeyGenerator('doc'), [])
  const [state, dispatch] = useReducer(
    markdownLoopReducer,
    initialMarkdownLoopState,
  )

  const handleReady = useCallback(
    (value: Array<PortableTextBlock>, schema: EditorSchema) => {
      schemaRef.current = schema
      dispatch({
        type: 'value ready',
        value,
        markdown: portableTextToMarkdown(value, {schema}),
      })
    },
    [],
  )

  const handleMutation = useCallback((value: Array<PortableTextBlock>) => {
    const schema = schemaRef.current
    if (!schema) {
      return
    }
    dispatch({
      type: 'mutation',
      value,
      markdown: portableTextToMarkdown(value, {schema}),
    })
  }, [])

  const handleInvalidValue = useCallback(() => {
    dispatch({type: 'invalid value'})
  }, [])

  function completeSync(result: Array<PortableTextBlock>) {
    const schema = schemaRef.current
    if (!schema || !state.snapshot) {
      return
    }

    // `mutation` events are debounced (1s), so the live engine value can
    // already have moved past the frozen read by the time Sync fires,
    // even though no `mutation` action has reached the reducer yet.
    // `snapshot.value` came from an earlier event payload and `getSnapshot()`
    // reads the engine's own live object, so the two are independent and a
    // deep compare (not `===`) is what actually catches the race.
    const liveValue = editorRef.current?.getSnapshot().context.value
    if (
      liveValue !== undefined &&
      !isDeepEqual(liveValue, state.snapshot.value)
    ) {
      dispatch({
        type: 'mutation',
        value: liveValue,
        markdown: portableTextToMarkdown(liveValue, {schema}),
      })
      return
    }

    const keyDelta = computeKeyDelta(state.snapshot.value, result)
    const markdown = portableTextToMarkdown(result, {schema})
    dispatch({type: 'synced', value: result, markdown, keyDelta})
    // `update value` itself emits no `mutation`, but the sync machine's
    // auto-resolution can still send a `patch` when the incoming value
    // needs validation repair, and that patch can debounce into one. Safe
    // either way: `dispatch('synced')` above already ran, so a slipped
    // mutation lands in `following`, not back in `editing`.
    editorRef.current?.send({type: 'update value', value: result})
  }

  function handleSync() {
    const schema = schemaRef.current
    if (!schema || !state.snapshot) {
      return
    }
    try {
      const result = applyMarkdownEdit(
        state.snapshot.value,
        state.markdownText,
        {
          schema,
          deserialize: {
            keyGenerator,
            onDegradation: (report) => {
              throw new MarkdownEditRejected(
                report.degradations,
                report.message,
              )
            },
          },
          serialize: {},
        },
      )
      completeSync(result)
    } catch (error) {
      if (error instanceof MarkdownEditRejected) {
        dispatch({
          type: 'degraded',
          names: error.degradations.map((degradation) => degradation.type),
        })
        return
      }
      throw error
    }
  }

  function handleWriteAnyway() {
    const schema = schemaRef.current
    if (!schema || !state.snapshot) {
      return
    }
    const result = applyMarkdownEdit(state.snapshot.value, state.markdownText, {
      schema,
      deserialize: {keyGenerator},
      serialize: {},
    })
    completeSync(result)
  }

  function regenerateAndFollow() {
    const schema = schemaRef.current
    if (!schema) {
      return
    }
    dispatch({
      type: 'discard',
      markdown: portableTextToMarkdown(state.value, {schema}),
    })
  }

  return (
    <ErrorBoundary
      fallbackProps={{area: 'MarkdownLoopPage'}}
      fallback={ErrorScreen}
      onError={console.error}
    >
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[5fr_4fr_3fr] gap-3 px-3 md:px-4 py-4 min-h-0 lg:min-h-[calc(100vh-8rem)]">
        <section className="flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Document
            </h2>
            <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
              the humans
            </span>
          </div>
          <div className="flex-1 flex flex-col min-h-0 p-2">
            <DocumentPane
              ref={editorRef}
              initialValue={seed}
              keyGenerator={keyGenerator}
              onReady={handleReady}
              onMutation={handleMutation}
              onInvalidValue={handleInvalidValue}
            />
          </div>
        </section>

        <MarkdownPane
          phase={state.phase}
          chip={state.chip}
          ready={state.ready}
          markdownText={state.markdownText}
          degradationNames={state.degradationNames}
          invalidValue={state.invalidValue}
          onChangeText={(text) => dispatch({type: 'markdown edited', text})}
          onSync={handleSync}
          onDiscard={regenerateAndFollow}
          onReRead={regenerateAndFollow}
          onFixMarkdown={() => dispatch({type: 'dismiss degradation'})}
          onWriteAnyway={handleWriteAnyway}
        />

        <PortableTextPane value={state.value} keyDelta={state.keyDelta} />
      </main>
    </ErrorBoundary>
  )
}
