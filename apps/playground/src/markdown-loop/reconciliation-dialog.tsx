import type {EditorSchema, PortableTextBlock} from '@portabletext/editor'
import type {ReconciliationReport} from '@portabletext/markdown'
import type {ReactNode} from 'react'
import {Fragment} from 'react'
import {Dialog} from '../primitives/dialog'
import {
  alignmentTokens,
  computeAlignmentView,
  type AlignmentToken,
} from './alignment'
import type {MarkdownLoopLastSync} from './loop-machine'
import {summarizeReport, type PreservedKeyBasis} from './report-summary'

type PerformedReconciliationReport = Extract<
  ReconciliationReport,
  {keyMatching: 'performed'}
>
type KeyFallback = PerformedReconciliationReport['keyFallbacks'][number]

type ReconciliationStep = {
  number: number
  title: string
  body: string
  visual: ReactNode
}

const steps: Array<ReconciliationStep> = [
  {
    number: 1,
    title: 'Tidy the stored copy.',
    body: 'The stored document is serialized to markdown and parsed back, so it is written in the same dialect as the edit.',
    visual: <VisualTidy />,
  },
  {
    number: 2,
    title: 'Safety check.',
    body: "Tidying may rewrite a block's insides, never the outline. If the outline changed, conversion mangled content and everything gets fresh keys.",
    visual: <VisualSafetyCheck />,
  },
  {
    number: 3,
    title: 'Turn both documents into strings.',
    body: 'Every distinct block content becomes one letter, and a text diff aligns the two strings. Same content, same letter; keys play no part.',
    visual: <VisualLetters />,
  },
  {
    number: 4,
    title: 'Unchanged content adopts.',
    body: 'Exact matches, in order, keep their keys.',
    visual: <VisualUnchanged />,
  },
  {
    number: 5,
    title: 'Moves adopt.',
    body: 'Unique content that reappears elsewhere keeps its key in its new spot.',
    visual: <VisualMove />,
  },
  {
    number: 6,
    title: 'Splits and merges.',
    body: "A split keeps the key on the first fragment; a merge keeps the first source's key.",
    visual: <VisualSplitMerge />,
  },
  {
    number: 7,
    title: 'Changed stretches.',
    body: 'Equal counts pair in order; unequal counts pair only on a mutually best match, never by position.',
    visual: <VisualHazard />,
  },
  {
    number: 8,
    title: 'Leftovers are new.',
    body: 'No evidence, no guess: fresh key.',
    visual: <VisualLeftover />,
  },
  {
    number: 9,
    title: 'Recurse inside.',
    body: 'The same walk runs at every depth; a failure deep inside resets keys only at that level.',
    visual: <VisualNesting />,
  },
  {
    number: 10,
    title: 'Restore what markdown cannot carry.',
    body: 'Fields the serialization drops are copied back; fields markdown carries follow the edit.',
    visual: <VisualFieldRestore />,
  },
  {
    number: 11,
    title: 'Final sweep.',
    body: 'No two siblings share a key; duplicates get fresh ones, adopted keys win.',
    visual: <VisualDuplicate />,
  },
]

export function ReconciliationInfoDialog(props: {
  trigger: ReactNode
  lastSync?: MarkdownLoopLastSync | null
  schema?: EditorSchema | null
}) {
  const lastSync = props.lastSync ?? null
  return (
    <Dialog
      title={
        lastSync
          ? 'How Sync decides which keys survive: annotated with your last sync'
          : 'How Sync decides which keys survive'
      }
      trigger={props.trigger}
      size="lg"
    >
      {() => (
        <ReconciliationDialogContent
          lastSync={lastSync}
          schema={props.schema ?? null}
        />
      )}
    </Dialog>
  )
}

function ReconciliationDialogContent(props: {
  lastSync?: MarkdownLoopLastSync | null
  schema?: EditorSchema | null
}) {
  const lastSync = props.lastSync ?? null
  const schema = props.schema ?? null
  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pe-1 text-sm text-gray-600 dark:text-gray-300">
      <p>
        The edited markdown comes back with no keys. Reconciliation walks the
        evidence from strongest to weakest, and the moment evidence runs out, it
        stops guessing and mints fresh keys.
      </p>
      <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          The one rule
        </p>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          A wrong key is corruption. A fresh key is only churn. Every limit in
          the algorithm fails toward fresh keys.
        </p>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={step.number} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                {step.number}
              </span>
              {index < steps.length - 1 ? (
                <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 pb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {step.body}
              </p>
              {step.visual}
              {lastSync ? renderSyncStrip(step.number, lastSync, schema) : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Accepted trades
        </h3>
        <ol className="flex flex-col gap-2">
          {ACCEPTED_TRADES.map((trade, index) => (
            <li
              key={trade.id}
              className="flex gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-2 text-xs text-gray-600 dark:text-gray-300"
            >
              <span className="shrink-0 font-semibold text-gray-400 dark:text-gray-500">
                {index + 1}
              </span>
              <span>{trade.content}</span>
            </li>
          ))}
        </ol>
        <p className="text-[11px] italic text-gray-400 dark:text-gray-500">
          Pinned as tests, deliberate, not bugs.
        </p>
      </div>
    </div>
  )
}

const ACCEPTED_TRADES: ReadonlyArray<{id: string; content: ReactNode}> = [
  {
    id: 'replace-in-place',
    content:
      'Replacing a block with unrelated content in the same position inherits its key.',
  },
  {
    id: 'balanced-rewrite',
    content:
      'A balanced rewrite of several siblings pairs by position and can mispair.',
  },
  {
    id: 'payload-cannot-rekey',
    content: (
      <>
        A{' '}
        <code className="rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
          json:object
        </code>{' '}
        payload's carried key loses to the stored key when content matches.
      </>
    ),
  },
]

/**
 * The label for step 4's teaching visual ("unchanged") doubles as the
 * strip's label for step 4's real data below it, and likewise for every
 * other preserved-key basis: one source of truth for the word a basis
 * displays as.
 */
const PRESERVED_KEY_BASIS_LABEL: Record<PreservedKeyBasis, string> = {
  'content-unchanged': 'unchanged',
  'content-moved': 'moved',
  'content-split': 'split',
  'content-merged': 'merged',
  'same-position': 'positional',
  'similar-content': 'similarity',
}

const MAX_DISPLAY_LETTERS = 30
const MAX_SNIPPET_LENGTH = 30
const MAX_SAMPLES = 3

function renderSyncStrip(
  stepNumber: number,
  lastSync: MarkdownLoopLastSync,
  schema: EditorSchema | null,
): ReactNode {
  switch (stepNumber) {
    case 1:
      return <SyncTidyStrip lastSync={lastSync} />
    case 2:
      return <SyncSafetyStrip lastSync={lastSync} />
    case 3:
      return <SyncLettersStrip lastSync={lastSync} schema={schema} />
    case 4:
      return <SyncTierStrip lastSync={lastSync} bases={['content-unchanged']} />
    case 5:
      return <SyncTierStrip lastSync={lastSync} bases={['content-moved']} />
    case 6:
      return (
        <SyncTierStrip
          lastSync={lastSync}
          bases={['content-split', 'content-merged']}
        />
      )
    case 7:
      return <SyncChangedStretchesStrip lastSync={lastSync} />
    case 8:
      return <SyncLeftoversStrip lastSync={lastSync} />
    case 9:
      return <SyncNestingStrip lastSync={lastSync} />
    case 10:
      return <SyncNotInReportStrip />
    case 11:
      return <SyncRepairsStrip lastSync={lastSync} />
    default:
      return null
  }
}

function SyncStrip(props: {children: ReactNode}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-2 text-xs text-sky-950 dark:text-sky-100">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
        your sync
      </span>
      {props.children}
    </div>
  )
}

function SyncNone() {
  return <span className="italic text-gray-400 dark:text-gray-500">none</span>
}

function SampleList(props: {
  samples: ReadonlyArray<{key: string; text: string | null}>
}) {
  if (props.samples.length === 0) {
    return null
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {props.samples.map((sample) => (
        <li key={sample.key} className="flex items-center gap-1.5">
          <Pill value={sample.key} tone="adopted" />
          {sample.text ? (
            <span className="truncate text-sky-900 dark:text-sky-200">
              {sample.text}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function SyncTidyStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const storedCount = props.lastSync.storedValue.length
  const tidiedCount = props.lastSync.tidiedValue.length
  return (
    <SyncStrip>
      <span>
        {storedCount} stored {storedCount === 1 ? 'block' : 'blocks'} → markdown
        → {tidiedCount} tidied {tidiedCount === 1 ? 'block' : 'blocks'}
      </span>
    </SyncStrip>
  )
}

function SyncSafetyStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const report = props.lastSync.report
  return (
    <SyncStrip>
      {report.keyMatching === 'skipped' ? (
        <span className="w-fit rounded px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
          {report.reason}: every key was minted fresh
        </span>
      ) : (
        <span className="text-emerald-700 dark:text-emerald-400">
          outline held
        </span>
      )}
    </SyncStrip>
  )
}

function SyncLettersStrip(props: {
  lastSync: MarkdownLoopLastSync
  schema: EditorSchema | null
}) {
  if (!props.schema) {
    return (
      <SyncStrip>
        <span className="italic text-gray-400 dark:text-gray-500">
          schema unavailable
        </span>
      </SyncStrip>
    )
  }

  const view = computeAlignmentView(
    props.lastSync.tidiedValue,
    props.lastSync.resultValue,
    props.schema,
  )

  if (view.status === 'too-large') {
    return (
      <SyncStrip>
        <span className="italic text-gray-400 dark:text-gray-500">
          too large to show
        </span>
      </SyncStrip>
    )
  }

  const tidied = capTokens(alignmentTokens(view.tidied))
  const edited = capTokens(alignmentTokens(view.edited))
  return (
    <SyncStrip>
      <AlignmentLine letters={tidied.tokens} />
      <AlignmentLine letters={edited.tokens} />
      {tidied.truncated || edited.truncated ? (
        <span className="text-gray-400 dark:text-gray-500">…</span>
      ) : null}
    </SyncStrip>
  )
}

function capTokens(tokens: ReadonlyArray<AlignmentToken>): {
  tokens: Array<AlignmentToken>
  truncated: boolean
} {
  if (tokens.length <= MAX_DISPLAY_LETTERS) {
    return {tokens: [...tokens], truncated: false}
  }
  return {tokens: tokens.slice(0, MAX_DISPLAY_LETTERS), truncated: true}
}

function SyncTierStrip(props: {
  lastSync: MarkdownLoopLastSync
  bases: ReadonlyArray<PreservedKeyBasis>
}) {
  const report = props.lastSync.report
  const preservedKeys =
    report.keyMatching === 'performed' ? report.preservedKeys : []
  const matches = preservedKeys.filter((preserved) =>
    props.bases.includes(preserved.basis),
  )
  if (matches.length === 0) {
    return (
      <SyncStrip>
        <SyncNone />
      </SyncStrip>
    )
  }

  const counts = props.bases
    .map((basis) => ({
      basis,
      count: matches.filter((preserved) => preserved.basis === basis).length,
    }))
    .filter((entry) => entry.count > 0)
  const samples = sampleTextsForPreservedKeys(
    matches,
    props.lastSync.resultValue,
  )

  return (
    <SyncStrip>
      <span>
        {counts
          .map(
            (entry) =>
              `${entry.count} ${PRESERVED_KEY_BASIS_LABEL[entry.basis]}`,
          )
          .join(' · ')}
      </span>
      <SampleList samples={samples} />
    </SyncStrip>
  )
}

function SyncChangedStretchesStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const report = props.lastSync.report
  const keyFallbacks =
    report.keyMatching === 'performed' ? report.keyFallbacks : []
  const ambiguousRegionFallbacks = keyFallbacks.filter(
    (
      fallback,
    ): fallback is Extract<KeyFallback, {type: 'ambiguous-region-too-large'}> =>
      fallback.type === 'ambiguous-region-too-large',
  )
  const ambiguousRegionKeyCount = ambiguousRegionFallbacks.reduce(
    (sum, fallback) => sum + fallback.keys.length,
    0,
  )
  return (
    <div className="flex flex-col gap-1">
      <SyncTierStrip
        lastSync={props.lastSync}
        bases={['same-position', 'similar-content']}
      />
      {ambiguousRegionKeyCount > 0 ? (
        <span className="w-fit rounded px-1.5 py-0.5 text-[11px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
          ambiguous-region-too-large: {ambiguousRegionKeyCount}{' '}
          {ambiguousRegionKeyCount === 1 ? 'key' : 'keys'} fell back to fresh
        </span>
      ) : null}
    </div>
  )
}

function SyncLeftoversStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const summary = summarizeReport(
    props.lastSync.report,
    props.lastSync.resultValue,
  )
  if (summary.freshCount === 0) {
    return (
      <SyncStrip>
        <SyncNone />
      </SyncStrip>
    )
  }

  const samples = [...summary.freshKeys].slice(0, MAX_SAMPLES).map((key) => ({
    key,
    text: blockTextSnippet(findBlockByKey(props.lastSync.resultValue, key)),
  }))

  return (
    <SyncStrip>
      <span>
        {summary.freshCount} fresh {summary.freshCount === 1 ? 'key' : 'keys'}
      </span>
      <SampleList samples={samples} />
    </SyncStrip>
  )
}

function SyncNestingStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const report = props.lastSync.report
  const nested =
    report.keyMatching === 'performed'
      ? report.preservedKeys.filter((preserved) => preserved.path.length > 1)
      : []
  const annotationKeyConflict =
    report.keyMatching === 'performed'
      ? report.keyFallbacks.find(
          (fallback) => fallback.type === 'annotation-key-conflict',
        )
      : undefined
  return (
    <SyncStrip>
      {nested.length === 0 ? (
        <SyncNone />
      ) : (
        <span>{nested.length} adopted inside containers/spans/markDefs</span>
      )}
      {annotationKeyConflict ? (
        <span className="w-fit rounded px-1.5 py-0.5 text-[11px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
          annotation-key-conflict
        </span>
      ) : null}
    </SyncStrip>
  )
}

function SyncNotInReportStrip() {
  return (
    <SyncStrip>
      <span className="italic text-gray-400 dark:text-gray-500">
        not part of the report
      </span>
    </SyncStrip>
  )
}

function SyncRepairsStrip(props: {lastSync: MarkdownLoopLastSync}) {
  const renamedKeys = props.lastSync.report.renamedKeys
  if (renamedKeys.length === 0) {
    return (
      <SyncStrip>
        <SyncNone />
      </SyncStrip>
    )
  }
  return (
    <SyncStrip>
      <span>
        {renamedKeys.length} {renamedKeys.length === 1 ? 'repair' : 'repairs'}
      </span>
      <ul className="flex flex-col gap-0.5">
        {renamedKeys.slice(0, MAX_SAMPLES).map((renamedKey) => (
          <li
            key={`${renamedKey.previousKey}-${renamedKey.key}`}
            className="flex items-center gap-1.5"
          >
            <Pill value={renamedKey.previousKey} tone="fresh" strike />
            <span aria-hidden="true">→</span>
            <Pill value={renamedKey.key} tone="adopted" />
          </li>
        ))}
      </ul>
    </SyncStrip>
  )
}

/**
 * A preserved key's own `key` names whatever node reconciliation matched
 * (a block, a span, a mark definition); the strip shows the surrounding
 * block's text instead, since a bare span or markDef key means nothing
 * on its own. `path[0]` is always that top-level block, keyed or not.
 */
function sampleTextsForPreservedKeys(
  preservedKeys: ReadonlyArray<
    PerformedReconciliationReport['preservedKeys'][number]
  >,
  resultValue: ReadonlyArray<PortableTextBlock>,
): Array<{key: string; text: string | null}> {
  return preservedKeys.slice(0, MAX_SAMPLES).map((preserved) => {
    const rootKey = rootBlockKey(preserved.path)
    const block = rootKey ? findBlockByKey(resultValue, rootKey) : undefined
    return {key: preserved.key, text: blockTextSnippet(block)}
  })
}

function rootBlockKey(
  path: PerformedReconciliationReport['preservedKeys'][number]['path'],
): string | null {
  const root = path[0]
  if (
    root === undefined ||
    typeof root === 'string' ||
    typeof root === 'number'
  ) {
    return null
  }
  return root._key
}

function findBlockByKey(
  value: ReadonlyArray<PortableTextBlock>,
  key: string,
): PortableTextBlock | undefined {
  return value.find((block) => block._key === key)
}

function blockTextSnippet(block: PortableTextBlock | undefined): string | null {
  if (!block) {
    return null
  }
  const children = (block as {children?: unknown}).children
  if (!Array.isArray(children)) {
    return null
  }
  const text = children
    .map((child) =>
      typeof child === 'object' && child !== null && 'text' in child
        ? String((child as {text?: unknown}).text ?? '')
        : '',
    )
    .join('')
  if (text.length === 0) {
    return null
  }
  return text.length > MAX_SNIPPET_LENGTH
    ? `${text.slice(0, MAX_SNIPPET_LENGTH)}…`
    : text
}

type PillTone = 'adopted' | 'fresh' | 'neutral'

const pillToneClasses: Record<PillTone, string> = {
  adopted:
    'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  fresh: 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}

function Pill(props: {value: string; tone: PillTone; strike?: boolean}) {
  return (
    <code
      className={`rounded px-1 py-0.5 font-mono text-[10px] ${pillToneClasses[props.tone]} ${props.strike ? 'line-through' : ''}`}
    >
      {props.value}
    </code>
  )
}

function ColumnLabel(props: {children: ReactNode}) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
      {props.children}
    </span>
  )
}

function MiniBlock(props: {
  text: string
  tone: PillTone
  keyValue: string
  struckKeyValue?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
      <span className="truncate">{props.text}</span>
      <span className="flex shrink-0 items-center gap-1">
        {props.struckKeyValue ? (
          <Pill value={props.struckKeyValue} tone="adopted" strike />
        ) : null}
        <Pill value={props.keyValue} tone={props.tone} />
      </span>
    </div>
  )
}

function EmptySlot() {
  return (
    <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs italic text-gray-400 dark:text-gray-500">
      no match
    </div>
  )
}

type ColsRow = {
  key: string
  left: ReactNode
  glyph: ReactNode
  right: ReactNode
}

function Cols(props: {
  leftLabel: string
  rightLabel: string
  rows: Array<ColsRow>
}) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
        <ColumnLabel>{props.leftLabel}</ColumnLabel>
        <span />
        <ColumnLabel>{props.rightLabel}</ColumnLabel>
        {props.rows.map((row) => (
          <Fragment key={row.key}>
            {row.left}
            <span className="flex justify-center text-gray-400 dark:text-gray-500">
              {row.glyph}
            </span>
            {row.right}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function VisualTidy() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
        <LabeledCard label="stored">
          <pre className={jsonCardClasses}>{storedBlockJson}</pre>
        </LabeledCard>
        <VerticalArrow label="portableTextToMarkdown" />
        <LabeledCard label="markdown">
          <MarkdownCard text="Cats are fine" />
        </LabeledCard>
        <VerticalArrow label="markdownToPortableText" />
        <LabeledCard label="tidied copy">
          <TidiedBlockJson />
        </LabeledCard>
      </div>
      <p className="text-[11px] italic text-gray-400 dark:text-gray-500">
        Same words, tidier insides. From here on, a difference against the edit
        means the edit did it.
      </p>
    </div>
  )
}

const jsonCardClasses =
  'rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 font-mono text-[10px] text-gray-700 dark:text-gray-300'

const storedBlockJson = `{
  "_key": "q2p", "_type": "block", "style": "normal",
  "children": [
    {"_key": "s1", "_type": "span", "text": "Cats are "},
    {"_key": "s2", "_type": "span", "text": "fine"}
  ]
}`

function TidiedBlockJson() {
  return (
    <pre className={jsonCardClasses}>
      {'{\n'}
      {'  "_key": "q2p", "_type": "block", "style": "normal",\n'}
      {'  "children": [\n'}
      <span className="rounded bg-emerald-50 dark:bg-emerald-900/40">
        {'    {"_key": '}
        <span className="rounded bg-amber-200 px-0.5 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
          "s7"
        </span>
        {', "_type": "span", "text": "Cats are fine"}\n'}
      </span>
      {'  ]\n'}
      {'}'}
    </pre>
  )
}

function LabeledCard(props: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <ColumnLabel>{props.label}</ColumnLabel>
      {props.children}
    </div>
  )
}

function VerticalArrow(props: {label: string}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
        ↓
      </span>
      <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
        {props.label}
      </span>
    </div>
  )
}

function MarkdownCard(props: {text: string}) {
  return (
    <pre className="truncate rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 font-mono text-[11px] text-gray-700 dark:text-gray-300">
      {props.text}
    </pre>
  )
}

function VisualSafetyCheck() {
  const rows = [
    {key: 'x7f', text: 'Dogs are great'},
    {key: 'q2p', text: 'Cats are fine'},
    {key: 'm9k', text: 'Birds sing'},
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Cols
            leftLabel="stored"
            rightLabel="tidied"
            rows={rows.map((row) => ({
              key: row.key,
              left: (
                <MiniBlock text={row.text} tone="neutral" keyValue={row.key} />
              ),
              glyph: (
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓
                </span>
              ),
              right: (
                <MiniBlock text={row.text} tone="neutral" keyValue={row.key} />
              ),
            }))}
          />
        </div>
        <ChecklistCard
          items={[
            'same block count · 3 = 3',
            'same types · p p p',
            'same text per block',
          ]}
        />
      </div>
      <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2 text-xs">
        <span className="text-amber-600 dark:text-amber-400">✕</span>
        <span className="text-gray-500 dark:text-gray-400">
          outline changed: every key is minted fresh
        </span>
        <span className="flex gap-1">
          {rows.map((row) => (
            <Pill key={row.key} value={row.key} tone="fresh" />
          ))}
        </span>
      </div>
    </div>
  )
}

function ChecklistCard(props: {items: Array<string>}) {
  return (
    <div className="flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <ul className="flex flex-col gap-1.5 text-xs text-gray-600 dark:text-gray-300">
        {props.items.map((item) => (
          <li key={item} className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function VisualLetters() {
  const tidied = [
    {text: 'Dogs are great', letter: 'A'},
    {text: 'Cats are fine', letter: 'B'},
    {text: 'Birds sing', letter: 'C'},
  ]
  const edited = [
    {text: 'Dogs are great', letter: 'A', amber: false},
    {text: 'Cats are fun', letter: 'D', amber: true},
    {text: 'Birds sing', letter: 'C', amber: false},
  ]
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <ColumnLabel>tidied copy</ColumnLabel>
          <ColumnLabel>edited</ColumnLabel>
          <div className="flex flex-col gap-1.5">
            {tidied.map((row) => (
              <LetterBlock
                key={row.letter}
                text={row.text}
                letter={row.letter}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {edited.map((row) => (
              <LetterBlock
                key={row.text}
                text={row.text}
                letter={row.letter}
                amber={row.amber}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
        <AlignmentLine
          letters={[
            {id: 'A#0', letter: 'A', amber: false},
            {id: 'B#0', letter: 'B', amber: true},
            {id: 'C#0', letter: 'C', amber: false},
          ]}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          diff
        </span>
        <AlignmentLine
          letters={[
            {id: 'A#0', letter: 'A', amber: false},
            {id: 'D#0', letter: 'D', amber: true},
            {id: 'C#0', letter: 'C', amber: false},
          ]}
        />
      </div>
      <p className="text-[11px] italic text-gray-400 dark:text-gray-500">
        Equal letters settle in order. What the diff cannot match becomes the
        changed stretches of step 7.
      </p>
    </div>
  )
}

function LetterBlock(props: {text: string; letter: string; amber?: boolean}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
      <span className="truncate">{props.text}</span>
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
          props.amber
            ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        }`}
      >
        {props.letter}
      </span>
    </div>
  )
}

function AlignmentLine(props: {letters: Array<AlignmentToken>}) {
  return (
    <div className="flex gap-3 font-mono text-sm">
      {props.letters.map((item) => (
        <span
          key={item.id}
          className={
            item.amber
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }
        >
          {item.letter}
        </span>
      ))}
    </div>
  )
}

function VisualUnchanged() {
  const rows = [
    {key: 'x7f', text: 'Dogs are great'},
    {key: 'q2p', text: 'Cats are fine'},
    {key: 'm9k', text: 'Birds sing'},
  ]
  return (
    <Cols
      leftLabel="stored"
      rightLabel="edited"
      rows={rows.map((row) => ({
        key: row.key,
        left: <MiniBlock text={row.text} tone="adopted" keyValue={row.key} />,
        glyph: '=',
        right: <MiniBlock text={row.text} tone="adopted" keyValue={row.key} />,
      }))}
    />
  )
}

function VisualMove() {
  const stored = [
    {key: 'x7f', text: 'Dogs are great'},
    {key: 'q2p', text: 'Cats are fine'},
    {key: 'm9k', text: 'Birds sing'},
  ]
  const edited = [
    {key: 'm9k', text: 'Birds sing', moved: true},
    {key: 'x7f', text: 'Dogs are great', moved: false},
    {key: 'q2p', text: 'Cats are fine', moved: false},
  ]
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <ColumnLabel>stored</ColumnLabel>
        <ColumnLabel>edited</ColumnLabel>
        <div className="flex flex-col gap-1.5">
          {stored.map((row) => (
            <MiniBlock
              key={row.key}
              text={row.text}
              tone="adopted"
              keyValue={row.key}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {edited.map((row) => (
            <div key={row.key} className="flex items-center gap-1.5">
              {row.moved ? (
                <span
                  aria-hidden="true"
                  className="text-gray-400 dark:text-gray-500"
                >
                  ↷
                </span>
              ) : null}
              <MiniBlock text={row.text} tone="adopted" keyValue={row.key} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VisualSplitMerge() {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-3 gap-y-2 text-xs">
        <ColumnLabel>stored</ColumnLabel>
        <span />
        <ColumnLabel>edited</ColumnLabel>
        <MiniBlock text="Dogs are great" tone="adopted" keyValue="x7f" />
        <span className="flex justify-center text-gray-400 dark:text-gray-500">
          →
        </span>
        <div className="flex flex-col gap-1">
          <MiniBlock text="Dogs are" tone="adopted" keyValue="x7f" />
          <MiniBlock text="great" tone="fresh" keyValue="fresh" />
        </div>
        <div className="flex flex-col gap-1">
          <MiniBlock text="Cats are" tone="adopted" keyValue="q2p" />
          <MiniBlock text="fine" tone="neutral" keyValue="t3z" />
        </div>
        <span className="flex justify-center text-gray-400 dark:text-gray-500">
          →
        </span>
        <MiniBlock text="Cats are fine" tone="adopted" keyValue="q2p" />
      </div>
    </div>
  )
}

function VisualHazard() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
        <ColumnLabel>stored</ColumnLabel>
        <ColumnLabel>edited</ColumnLabel>
        <div className="flex flex-col gap-1.5">
          <MiniBlock text="Cats are fine" tone="adopted" keyValue="q2p" />
          <MiniBlock text="Fish are quiet" tone="adopted" keyValue="f4t" />
        </div>
        <div className="flex flex-col gap-1.5">
          <MiniBlock text="A word on pets:" tone="fresh" keyValue="fresh" />
          <MiniBlock text="Cats are fun" tone="adopted" keyValue="q2p" />
          <MiniBlock text="Fish are quiet-ish" tone="adopted" keyValue="f4t" />
        </div>
      </div>
      <p className="text-[11px] italic text-gray-400 dark:text-gray-500">
        One insertion shifts every position, so unequal counts pair by
        similarity, never by slot. Similarity is a character diff on the block's
        text: it adopts only above a high bar, and only when the pairing is the
        best from both sides.
      </p>
    </div>
  )
}

function VisualLeftover() {
  return (
    <Cols
      leftLabel="stored"
      rightLabel="edited"
      rows={[
        {
          key: 'hamsters',
          left: <EmptySlot />,
          glyph: null,
          right: (
            <MiniBlock text="Also: hamsters." tone="fresh" keyValue="fresh" />
          ),
        },
      ]}
    />
  )
}

function VisualNesting() {
  return (
    <NestingLevel label="table" keyValue="a1x">
      <NestingLevel label="row" keyValue="b2y">
        <NestingLevel label="cell" keyValue="c3z">
          <MiniBlock text="Some cell text" tone="fresh" keyValue="fresh" />
        </NestingLevel>
      </NestingLevel>
    </NestingLevel>
  )
}

function NestingLevel(props: {
  label: string
  keyValue: string
  children: ReactNode
}) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {props.label}
        </span>
        <Pill value={props.keyValue} tone="adopted" />
      </div>
      {props.children}
    </div>
  )
}

function VisualFieldRestore() {
  return (
    <Cols
      leftLabel="stored"
      rightLabel="edited"
      rows={[
        {
          key: 'alignment',
          left: <Pill value="alignment: center" tone="neutral" />,
          glyph: '→',
          right: <Pill value="alignment: center" tone="adopted" />,
        },
        {
          key: 'language',
          left: <Pill value="language: ts" tone="neutral" />,
          glyph: '✕',
          right: (
            <span className="text-[10px] italic text-gray-400 dark:text-gray-500">
              edit removed it
            </span>
          ),
        },
      ]}
    />
  )
}

function VisualDuplicate() {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
      <div className="flex flex-col gap-1.5 text-xs">
        <ColumnLabel>edited</ColumnLabel>
        <MiniBlock text="Cats are fine" tone="adopted" keyValue="q2p" />
        <MiniBlock
          text="Cats are also fine"
          tone="fresh"
          keyValue="fresh"
          struckKeyValue="q2p"
        />
      </div>
    </div>
  )
}
