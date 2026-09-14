import type {
  Editor,
  EditorSchema,
  PortableTextBlock,
} from '@portabletext/editor'
import {
  applyMarkdownEdit,
  markdownToPortableText,
  portableTextToMarkdown,
  type ReconciliationReport,
} from '@portabletext/markdown'
import {useActorRef, useSelector} from '@xstate/react'
import type {ReactNode} from 'react'
import {useCallback, useMemo, useRef, useState} from 'react'
import {isDeepEqual} from 'remeda'
import {createKeyGenerator} from '../key-generator'
import {ErrorBoundary} from '../primitives/error-boundary'
import {ErrorScreen} from '../primitives/error-screen'
import {Select, SelectItem} from '../primitives/select'
import {MarkdownEditRejected} from './degradation-error'
import {DocumentPane} from './document-pane'
import {computeKeyDelta} from './key-delta'
import {loopMachine, type MarkdownLoopChip} from './loop-machine'
import {MarkdownPane} from './markdown-pane'
import {PortableTextPane} from './portable-text-pane'
import {
  markdownLoopPresets,
  type MarkdownLoopPreset,
  type MarkdownLoopPresetId,
} from './presets'
import {summarizeReport} from './report-summary'
import {detectRoundTripMismatch} from './round-trip-mismatch'

export function MarkdownLoopPage(props: {
  preset: MarkdownLoopPreset
  onPresetChange: (id: MarkdownLoopPresetId) => void
}) {
  const editorRef = useRef<Editor | null>(null)
  const schemaRef = useRef<EditorSchema | null>(null)
  // Mirrors `schemaRef` for the one consumer (`PortableTextPane`'s Evidence
  // tab) that reads it during render: reading a ref's `.current` there
  // would read whatever the ref held during that render pass, not react
  // to it changing.
  const [readySchema, setReadySchema] = useState<EditorSchema | null>(null)
  const seed = useMemo(() => props.preset.seed(), [props.preset])
  const keyGenerator = useMemo(() => createKeyGenerator('doc'), [])
  const loopRef = useActorRef(loopMachine)

  const phase = useSelector(loopRef, (state) => state.value)
  const ready = useSelector(loopRef, (state) => state.context.ready)
  const value = useSelector(loopRef, (state) => state.context.value)
  const markdownText = useSelector(
    loopRef,
    (state) => state.context.markdownText,
  )
  const chip = useSelector(loopRef, (state) => state.context.chip)
  const degradationNames = useSelector(
    loopRef,
    (state) => state.context.degradationNames,
  )
  const report = useSelector(loopRef, (state) => state.context.report)
  // Renamed from the field's own `snapshot` name to keep it apart from
  // the xstate actor snapshot every `useSelector` call above reads from.
  const readSnapshot = useSelector(loopRef, (state) => state.context.snapshot)
  const lastSync = useSelector(loopRef, (state) => state.context.lastSync)
  const invalidValue = useSelector(
    loopRef,
    (state) => state.context.invalidValue,
  )
  const roundTripMismatchDismissed = useSelector(
    loopRef,
    (state) => state.context.roundTripMismatchDismissed,
  )

  const handleReady = useCallback(
    (value: Array<PortableTextBlock>, schema: EditorSchema) => {
      schemaRef.current = schema
      setReadySchema(schema)
      loopRef.send({type: 'value ready', value})
    },
    [loopRef],
  )

  const handleMutation = useCallback(
    (value: Array<PortableTextBlock>) => {
      loopRef.send({type: 'mutation', value})
    },
    [loopRef],
  )

  const handleInvalidValue = useCallback(() => {
    loopRef.send({type: 'invalid value'})
  }, [loopRef])

  function liveValueOrEmpty(): Array<PortableTextBlock> {
    return editorRef.current?.getSnapshot().context.value ?? []
  }

  function takeRead() {
    const schema = schemaRef.current
    if (!schema) {
      return
    }
    // The live engine value, not the debounced `mutation` payload sitting
    // in context: a read frozen from a stale value would let the human's
    // already-landed edit resurface as a spurious conflict.
    const liveValue = liveValueOrEmpty()
    const markdown = portableTextToMarkdown(liveValue, {schema})
    // A throwaway generator: these keys never leave the Evidence
    // tab, so they must not draw from the same sequence real syncs
    // draw fresh keys from.
    const tidied = markdownToPortableText(markdown, {
      schema,
      keyGenerator: createKeyGenerator('tidied'),
    })
    const roundTripMismatch = detectRoundTripMismatch(liveValue, tidied, schema)
    loopRef.send({
      type: 'read taken',
      markdown,
      value: liveValue,
      tidied,
      roundTripMismatch,
    })
  }

  function reloadFromEditor() {
    loopRef.send({type: 'reload from editor', value: liveValueOrEmpty()})
  }

  function completeSync(
    result: Array<PortableTextBlock>,
    report: ReconciliationReport,
  ) {
    const schema = schemaRef.current
    if (!schema || !readSnapshot) {
      return
    }

    // `mutation` events are debounced (1s), so the live engine value can
    // already have moved past the frozen read by the time Sync fires,
    // even though no `mutation` action has reached the machine yet.
    // `readSnapshot.value` came from an earlier event payload and `getSnapshot()`
    // reads the engine's own live object, so the two are independent and a
    // deep compare (not `===`) is what actually catches the race.
    const liveValue = editorRef.current?.getSnapshot().context.value
    if (
      liveValue !== undefined &&
      !isDeepEqual(liveValue, readSnapshot.value)
    ) {
      loopRef.send({type: 'mutation', value: liveValue})
      return
    }

    if (import.meta.env.DEV) {
      // `computeKeyDelta` derives fresh/adopted purely from a before/after
      // key-set diff; `summarizeReport` derives the same counts from the
      // report's own `preservedKeys`. They should always agree, so a
      // mismatch here means one of the two computations has drifted.
      const delta = computeKeyDelta(readSnapshot.value, result)
      const summary = summarizeReport(report, result)
      if (delta.freshCount !== summary.freshCount) {
        console.warn(
          'markdown loop: report-derived fresh count disagrees with computeKeyDelta',
          {reportDerived: summary.freshCount, keyDelta: delta.freshCount},
        )
      }
    }

    loopRef.send({type: 'sync succeeded', value: result, report})
    // `update value` itself emits no `mutation`, but the sync machine's
    // auto-resolution can still send a `patch` when the incoming value
    // needs validation repair, and that patch can debounce into one. Safe
    // either way: `send('sync succeeded')` above already ran, so a slipped
    // mutation lands in `authoring`, not back in `editing`.
    editorRef.current?.send({type: 'update value', value: result})
  }

  function handleSync() {
    const schema = schemaRef.current
    if (!schema || !readSnapshot) {
      return
    }
    try {
      const {result, report} = applyMarkdownEditCapturingReport(
        (onReconciliation) =>
          applyMarkdownEdit(readSnapshot.value, markdownText, {
            schema,
            deserialize: {
              keyGenerator,
              onDegradation: (degradationReport) => {
                throw new MarkdownEditRejected(
                  degradationReport.degradations,
                  degradationReport.message,
                )
              },
            },
            serialize: {},
            onReconciliation,
          }),
      )
      completeSync(result, report)
    } catch (error) {
      if (error instanceof MarkdownEditRejected) {
        loopRef.send({
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
    if (!schema || !readSnapshot) {
      return
    }
    const {result, report} = applyMarkdownEditCapturingReport(
      (onReconciliation) =>
        applyMarkdownEdit(readSnapshot.value, markdownText, {
          schema,
          deserialize: {keyGenerator},
          serialize: {},
          onReconciliation,
        }),
    )
    completeSync(result, report)
  }

  return (
    <ErrorBoundary
      fallbackProps={{area: 'MarkdownLoopPage'}}
      fallback={ErrorScreen}
      onError={console.error}
    >
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[5fr_4fr_3fr] gap-3 px-3 md:px-4 py-4 min-h-0">
        <DocumentSection
          variant={phase === 'authoring' ? 'authoring' : 'editing'}
          chip={chip}
          preset={props.preset}
          onPresetChange={props.onPresetChange}
        >
          <DocumentPane
            ref={editorRef}
            preset={props.preset}
            initialValue={seed}
            keyGenerator={keyGenerator}
            onReady={handleReady}
            onMutation={handleMutation}
            onInvalidValue={handleInvalidValue}
          />
        </DocumentSection>

        <MarkdownPane
          phase={phase}
          ready={ready}
          markdownText={markdownText}
          degradationNames={degradationNames}
          invalidValue={invalidValue}
          roundTripMismatch={readSnapshot?.roundTripMismatch ?? null}
          roundTripMismatchDismissed={roundTripMismatchDismissed}
          onChangeText={(text) => loopRef.send({type: 'markdown edited', text})}
          onSync={handleSync}
          onDiscard={() => loopRef.send({type: 'discard'})}
          onReRead={takeRead}
          onReloadFromEditor={reloadFromEditor}
          onFixMarkdown={() => loopRef.send({type: 'dismiss degradation'})}
          onWriteAnyway={handleWriteAnyway}
          onEditAsMarkdown={takeRead}
          onDismissRoundTripMismatch={() =>
            loopRef.send({type: 'dismiss round-trip mismatch'})
          }
        />

        <PortableTextPane
          value={value}
          report={report}
          snapshot={readSnapshot}
          markdownText={markdownText}
          lastSync={lastSync}
          schema={readySchema}
        />
      </main>
    </ErrorBoundary>
  )
}

/**
 * `onReconciliation` fires exactly once, synchronously, before `run`'s
 * `applyMarkdownEdit` call returns, unless a strict `onDegradation`
 * threw first: reaching this function's own throw without a captured
 * report means that contract broke.
 */
function applyMarkdownEditCapturingReport(
  run: (
    onReconciliation: (report: ReconciliationReport) => void,
  ) => Array<PortableTextBlock>,
): {result: Array<PortableTextBlock>; report: ReconciliationReport} {
  let capturedReport: ReconciliationReport | undefined
  const result = run((report) => {
    capturedReport = report
  })
  if (!capturedReport) {
    throw new Error(
      'applyMarkdownEdit returned without a reconciliation report',
    )
  }
  return {result, report: capturedReport}
}

function DocumentSection(props: {
  variant: 'authoring' | 'editing'
  chip: MarkdownLoopChip | null
  preset: MarkdownLoopPreset
  onPresetChange: (id: MarkdownLoopPresetId) => void
  children: ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Document
        </h2>
        <span className="flex items-center gap-2">
          {props.variant === 'authoring' ? (
            <>
              <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
                author it here
              </span>
              {props.chip === 'synced' ? (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  synced ✓
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
              the humans · still editing
            </span>
          )}
          <PresetPicker
            presetId={props.preset.id}
            onPresetChange={props.onPresetChange}
          />
        </span>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-2">{props.children}</div>
    </section>
  )
}

function PresetPicker(props: {
  presetId: MarkdownLoopPresetId
  onPresetChange: (id: MarkdownLoopPresetId) => void
}) {
  return (
    <Select
      aria-label="Schema"
      className="w-28"
      selectedKey={props.presetId}
      onSelectionChange={(id) => {
        if (typeof id === 'string') {
          props.onPresetChange(id as MarkdownLoopPresetId)
        }
      }}
    >
      {markdownLoopPresets.map((candidate) => (
        <SelectItem key={candidate.id} id={candidate.id}>
          {candidate.label}
        </SelectItem>
      ))}
    </Select>
  )
}
