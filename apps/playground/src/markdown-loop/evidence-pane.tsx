import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import {markdownToPortableText} from '@portabletext/markdown'
import {useActorRef, useSelector} from '@xstate/react'
import {type ReactNode, useEffect, useRef, useState} from 'react'
import {highlightMachine} from '../highlight-json-machine'
import {createKeyGenerator} from '../key-generator'
import {Spinner} from '../primitives/spinner'
import {
  computeAlignmentView,
  MAX_DISTINCT_BLOCK_FORMS,
  type AlignmentRowItem,
  type AlignmentRun,
  type AlignmentView,
} from './alignment'
import type {MarkdownLoopSnapshot} from './loop-machine'
import {formatRoundTripMismatchBanner} from './round-trip-mismatch'

const ALIGNMENT_DEBOUNCE_MS = 200

/**
 * The Portable Text panel's Stored tab: the snapshot value exactly as it
 * was read, before `applyMarkdownEdit` ever sees the edited markdown.
 * `snapshot` is null exactly in `authoring`, before any read has been
 * taken, so that alone decides between the empty state and the JSON.
 */
export function StoredTabContent(props: {
  snapshot: MarkdownLoopSnapshot | null
}) {
  if (!props.snapshot) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col overflow-hidden">
      <TabCaption>frozen at read</TabCaption>
      <HighlightedJson value={props.snapshot.value} />
    </div>
  )
}

/**
 * The Portable Text panel's Tidied tab: `snapshot.tidied`, the same
 * value `applyMarkdownEdit` itself aligns the edit against.
 */
export function TidiedTabContent(props: {
  snapshot: MarkdownLoopSnapshot | null
}) {
  if (!props.snapshot) {
    return <EmptyState />
  }

  const mismatch = props.snapshot.roundTripMismatch

  return (
    <div className="flex flex-col overflow-hidden">
      <TabCaption>serialize → parse</TabCaption>
      {mismatch ? (
        <p className="border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/40 px-3 py-1 text-[11px] text-amber-800 dark:text-amber-300">
          {formatRoundTripMismatchBanner(mismatch)}
        </p>
      ) : null}
      <HighlightedJson value={props.snapshot.tidied} />
    </div>
  )
}

/**
 * The Portable Text panel's Alignment tab: a live letter diff between the
 * tidied copy and the edited markdown, re-derived on every keystroke.
 */
export function AlignmentTabContent(props: {
  snapshot: MarkdownLoopSnapshot | null
  markdownText: string
  schema: EditorSchema | null
}) {
  if (!props.snapshot) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col gap-1.5 overflow-auto p-2">
      <TabCaption>derived · live</TabCaption>
      <LiveAlignment
        markdownText={props.markdownText}
        tidied={props.snapshot.tidied}
        schema={props.schema}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <p className="p-2 text-xs text-gray-400 dark:text-gray-500">
      take a read first
    </p>
  )
}

/**
 * Shiki-highlighted JSON for the Stored and Tidied tabs: the same
 * `highlightMachine` the Inspector's Output tab and each editor's
 * debug `JsonPane` use, so all three read as the same JSON style. The
 * Live tab keeps `renderJsonValue` instead: it needs to single out
 * `_key` values for fresh-key highlighting and reconciliation badges,
 * which shiki's generic tokenizer has no notion of.
 */
function HighlightedJson(props: {value: unknown}) {
  const json = JSON.stringify(props.value ?? null)
  const highlightRef = useActorRef(highlightMachine, {
    input: {code: json, variant: 'default'},
  })
  const highlightedCode = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )

  useEffect(() => {
    highlightRef.send({type: 'update code', code: json})
  }, [json, highlightRef])

  if (!highlightedCode) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto text-xs [&>pre]:m-0 [&>pre]:px-3 [&>pre]:py-2"
      dangerouslySetInnerHTML={{__html: highlightedCode}}
    />
  )
}

function TabCaption(props: {children: ReactNode}) {
  return (
    <p className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {props.children}
    </p>
  )
}

/**
 * Re-parses the edited markdown on every change (debounced) and diffs it
 * against the tidied copy the same way `applyMarkdownEdit` aligns the two
 * before adopting keys. A parse failure keeps the previous alignment on
 * screen rather than blanking the tab: the letters below are still true
 * of the last markdown that parsed, which is more useful mid-keystroke
 * than nothing.
 */
function LiveAlignment(props: {
  markdownText: string
  tidied: Array<PortableTextBlock> | undefined
  schema: EditorSchema | null
}) {
  const [view, setView] = useState<AlignmentView | null>(null)
  const [unparseable, setUnparseable] = useState(false)
  const isFirstRun = useRef(true)

  useEffect(() => {
    const schema = props.schema
    const tidied = props.tidied
    if (!schema || !tidied) {
      return
    }

    const delay = isFirstRun.current ? 0 : ALIGNMENT_DEBOUNCE_MS
    isFirstRun.current = false

    const timeoutId = setTimeout(() => {
      try {
        const edited = markdownToPortableText(props.markdownText, {
          schema,
          keyGenerator: createKeyGenerator('alignment'),
        })
        setView(computeAlignmentView(tidied, edited, schema))
        setUnparseable(false)
      } catch {
        setUnparseable(true)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [props.markdownText, props.tidied, props.schema])

  if (!view) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500">computing…</p>
    )
  }

  return <AlignmentResultView view={view} unparseable={unparseable} />
}

/**
 * The pure rendering of one `AlignmentView`, split out from `LiveAlignment`
 * so it renders the same on the server (no hooks, no effects) as it does
 * mid-keystroke in the browser.
 */
function AlignmentResultView(props: {
  view: AlignmentView
  unparseable?: boolean
}) {
  const view = props.view
  return (
    <>
      {props.unparseable ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          unparseable right now
        </p>
      ) : null}
      {view.status === 'too-large' ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          document too large for the live view
        </p>
      ) : (
        <>
          <AlignmentRow items={view.tidied} />
          <AlignmentRow items={view.edited} />
          {hasGhosts(view.tidied) || hasGhosts(view.edited) ? (
            <p className="text-[10px] italic text-gray-400 dark:text-gray-500">
              dashed = empty block, invisible to markdown and skipped from
              alignment
            </p>
          ) : null}
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {formatRunLegend(view.runs)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {summarizeAlignment(view.summary)}
          </p>
          <DistinctFormsMeter count={view.distinctFormCount} />
        </>
      )}
    </>
  )
}

function AlignmentRow(props: {items: ReadonlyArray<AlignmentRowItem>}) {
  const positioned = props.items.map((item, position) => ({item, position}))
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
      {positioned.map(({item, position}) =>
        item.kind === 'ghost' ? (
          <span
            key={position}
            title="empty block: invisible to markdown, skipped from alignment"
            className="rounded border border-dashed border-gray-300 px-1 text-gray-300 opacity-60 dark:border-gray-600 dark:text-gray-600"
          >
            ∅
          </span>
        ) : (
          <span
            key={position}
            className={
              item.amber
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }
          >
            {item.letter}
          </span>
        ),
      )}
    </div>
  )
}

function hasGhosts(items: ReadonlyArray<AlignmentRowItem>): boolean {
  return items.some((item) => item.kind === 'ghost')
}

const MAX_LEGEND_GAPS = 2

/**
 * Translates the diff's runs into the words a person would use to
 * describe them: which letters settled as anchors, how many gaps got
 * paired against what, and what was purely added or removed.
 */
function formatRunLegend(runs: ReadonlyArray<AlignmentRun>): string {
  const anchorLetters = runs
    .filter(
      (run): run is Extract<AlignmentRun, {kind: 'anchor'}> =>
        run.kind === 'anchor',
    )
    .flatMap((run) => run.letters)
  const gaps = runs.filter(
    (run): run is Extract<AlignmentRun, {kind: 'gap'}> => run.kind === 'gap',
  )
  const addedLetters = runs
    .filter(
      (run): run is Extract<AlignmentRun, {kind: 'added'}> =>
        run.kind === 'added',
    )
    .flatMap((run) => run.letters)
  const removedLetters = runs
    .filter(
      (run): run is Extract<AlignmentRun, {kind: 'removed'}> =>
        run.kind === 'removed',
    )
    .flatMap((run) => run.letters)

  const parts: Array<string> = []
  if (anchorLetters.length > 0) {
    parts.push(`anchors ${anchorLetters.join(' ')}`)
  }
  if (gaps.length > 0) {
    const shown = gaps
      .slice(0, MAX_LEGEND_GAPS)
      .map(
        (gap) =>
          `${gap.removedLetters.join(' ')} → ${gap.addedLetters.join(' ')}`,
      )
    const overflow =
      gaps.length > MAX_LEGEND_GAPS
        ? `, +${gaps.length - MAX_LEGEND_GAPS} more`
        : ''
    parts.push(
      `${gaps.length} ${gaps.length === 1 ? 'gap' : 'gaps'} (${shown.join(', ')}${overflow})`,
    )
  }
  if (addedLetters.length > 0) {
    parts.push(
      `${addedLetters.length} ${addedLetters.length === 1 ? 'block' : 'blocks'} added`,
    )
  }
  if (removedLetters.length > 0) {
    parts.push(
      `${removedLetters.length} ${removedLetters.length === 1 ? 'block' : 'blocks'} removed`,
    )
  }
  return parts.length > 0 ? parts.join(' · ') : 'no blocks'
}

/**
 * The ceiling is on distinct block *forms*, not blocks: this document
 * realistically never has enough distinct forms to move the bar past a
 * sliver, which is the point, the meter exists to show the ceiling is
 * there at all, not to warn that this document is near it.
 */
function DistinctFormsMeter(props: {count: number}) {
  const ratio = Math.min(props.count / MAX_DISTINCT_BLOCK_FORMS, 1)
  const percent = ratio > 0 ? Math.max(ratio * 100, 0.75) : 0
  const barColor =
    ratio > 0.9 ? 'bg-red-500' : ratio > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div
      className="flex flex-col gap-1"
      title="past the ceiling, alignment refuses and every key is minted fresh"
    >
      <span className="text-[11px] text-gray-500 dark:text-gray-400">
        {props.count} distinct block {props.count === 1 ? 'form' : 'forms'} ·
        ceiling {MAX_DISTINCT_BLOCK_FORMS.toLocaleString('en-US')}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full ${barColor}`} style={{width: `${percent}%`}} />
      </div>
    </div>
  )
}

function summarizeAlignment(summary: {
  settledCount: number
  changedStretchCount: number
  onlyInEditCount: number
  removedCount: number
}): string {
  const parts = [
    `${summary.settledCount} ${summary.settledCount === 1 ? 'block matches' : 'blocks match'} the document`,
  ]
  if (summary.changedStretchCount > 0) {
    parts.push(
      `${summary.changedStretchCount} ${summary.changedStretchCount === 1 ? 'section' : 'sections'} rewritten`,
    )
  }
  if (summary.onlyInEditCount > 0) {
    parts.push(
      `${summary.onlyInEditCount} ${summary.onlyInEditCount === 1 ? 'block' : 'blocks'} added`,
    )
  }
  if (summary.removedCount > 0) {
    parts.push(
      `${summary.removedCount} ${summary.removedCount === 1 ? 'block' : 'blocks'} removed`,
    )
  }
  if (parts.length === 1 && summary.settledCount > 0) {
    return `everything matches · ${summary.settledCount} blocks`
  }
  return parts.join(' · ')
}
