import {InfoIcon} from 'lucide-react'
import {tv} from 'tailwind-variants'
import {Button} from '../primitives/button'
import {ButtonTooltip} from '../toolbar/button-tooltip'
import type {MarkdownLoopPhase} from './loop-machine'
import {ReconciliationInfoDialog} from './reconciliation-dialog'
import {
  formatRoundTripMismatchCard,
  type RoundTripMismatch,
} from './round-trip-mismatch'

const chip = tv({
  base: 'text-xs font-medium px-2 py-0.5 rounded-full',
  variants: {
    tone: {
      editing:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
      conflict: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
    },
  },
})

export function MarkdownPane(props: {
  className?: string
  phase: MarkdownLoopPhase
  ready: boolean
  markdownText: string
  degradationNames: ReadonlyArray<string> | null
  invalidValue: boolean
  roundTripMismatch: RoundTripMismatch | null
  roundTripMismatchDismissed: boolean
  onChangeText: (text: string) => void
  onSync: () => void
  onDiscard: () => void
  onReRead: () => void
  onReloadFromEditor: () => void
  onFixMarkdown: () => void
  onWriteAnyway: () => void
  onEditAsMarkdown: () => void
  onDismissRoundTripMismatch: () => void
}) {
  if (props.phase === 'authoring') {
    return (
      <section
        className={`flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${props.className ?? ''}`}
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Markdown
          </h2>
          <Button
            size="sm"
            variant="primary"
            isDisabled={!props.ready}
            onPress={props.onEditAsMarkdown}
          >
            Edit as markdown →
          </Button>
        </div>
        {props.invalidValue ? (
          <RisingCard>
            <p>The editor refused the synced value.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onPress={props.onReloadFromEditor}
              >
                Reload from editor
              </Button>
            </div>
          </RisingCard>
        ) : null}
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Take a read of the document and edit it as an agent would.
          </p>
        </div>
      </section>
    )
  }

  const tone = props.degradationNames
    ? 'conflict'
    : props.phase === 'conflict'
      ? 'conflict'
      : 'editing'
  const label = props.degradationNames
    ? 'read taken · rejected'
    : props.phase === 'conflict'
      ? 'conflict'
      : 'read taken'

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${props.className ?? ''}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Markdown
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
            you, the agent
          </span>
          <span className={chip({tone})}>{label}</span>
          <ReconciliationInfoDialog
            trigger={
              <ButtonTooltip label="How Sync decides which keys survive">
                <Button variant="ghost" size="sm">
                  <InfoIcon className="size-3" />
                </Button>
              </ButtonTooltip>
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
        <Button
          size="sm"
          variant="primary"
          isDisabled={props.phase !== 'editing'}
          onPress={props.onSync}
        >
          Sync
        </Button>
        <Button size="sm" variant="secondary" onPress={props.onDiscard}>
          Discard
        </Button>
        <span className="ms-auto text-[11px] text-gray-400 dark:text-gray-500">
          {actionHint(props.phase)}
        </span>
      </div>

      {props.phase === 'conflict' ? (
        <RisingCard>
          <p>
            The document changed since your read. Writing a stale edit would
            overwrite it, so the loop starts over instead of merging.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onPress={props.onReRead}>
              Re-read
            </Button>
          </div>
        </RisingCard>
      ) : props.degradationNames ? (
        <RisingCard>
          <div className="flex flex-wrap items-center gap-1">
            {[...new Set(props.degradationNames)].map((name) => (
              <code
                key={name}
                className="rounded bg-red-100 dark:bg-red-900/50 px-1 py-0.5 text-xs text-red-800 dark:text-red-300"
              >
                {name}
              </code>
            ))}
            <span>Nothing was written.</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onPress={props.onFixMarkdown}>
              Fix the markdown
            </Button>
            <Button size="sm" variant="secondary" onPress={props.onWriteAnyway}>
              Write anyway
            </Button>
          </div>
        </RisingCard>
      ) : props.invalidValue ? (
        <RisingCard>
          <p>The editor refused the synced value.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onPress={props.onReRead}>
              Re-read
            </Button>
          </div>
        </RisingCard>
      ) : null}

      {props.roundTripMismatch && !props.roundTripMismatchDismissed ? (
        <RisingCard tone="amber">
          <p>{formatRoundTripMismatchCard(props.roundTripMismatch)}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={props.onDismissRoundTripMismatch}
            >
              Understood
            </Button>
          </div>
        </RisingCard>
      ) : null}

      <textarea
        className="flex-1 min-h-40 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
        spellCheck={false}
        value={props.markdownText}
        disabled={!props.ready || props.phase === 'conflict'}
        onChange={(event) => props.onChangeText(event.target.value)}
      />
    </section>
  )
}

function actionHint(phase: 'editing' | 'conflict'): string {
  return phase === 'conflict'
    ? 'the read went stale'
    : 'read taken · the document stays editable'
}

const risingCard = tv({
  base: 'animate-[markdown-loop-rise_0.18s_ease-out] mx-2 mt-2 flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 bg-white dark:bg-gray-800 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 shadow-sm',
  variants: {
    tone: {
      red: 'border-l-red-400 dark:border-l-red-500',
      amber: 'border-l-amber-400 dark:border-l-amber-500',
    },
  },
  defaultVariants: {
    tone: 'red',
  },
})

function RisingCard(props: {
  children: React.ReactNode
  tone?: 'red' | 'amber'
}) {
  return <div className={risingCard({tone: props.tone})}>{props.children}</div>
}
