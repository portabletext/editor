import {tv} from 'tailwind-variants'
import {Button} from '../primitives/button'
import type {MarkdownLoopChip, MarkdownLoopPhase} from './loop-state'

const chip = tv({
  base: 'text-xs font-medium px-2 py-0.5 rounded-full',
  variants: {
    tone: {
      following:
        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      editing:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
      conflict: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',
      synced:
        'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    },
  },
})

export function MarkdownPane(props: {
  phase: MarkdownLoopPhase
  chip: MarkdownLoopChip
  ready: boolean
  markdownText: string
  degradationNames: ReadonlyArray<string> | null
  invalidValue: boolean
  onChangeText: (text: string) => void
  onSync: () => void
  onDiscard: () => void
  onReRead: () => void
  onFixMarkdown: () => void
  onWriteAnyway: () => void
}) {
  const tone = props.degradationNames ? 'conflict' : props.chip
  const label = props.degradationNames
    ? 'editing · rejected'
    : chipLabel(props.chip)

  return (
    <section className="relative flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Markdown
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
            you, the agent
          </span>
          <span className={chip({tone})}>{label}</span>
        </div>
      </div>

      <textarea
        className="flex-1 min-h-40 resize-none border-0 bg-transparent px-3 py-2 font-mono text-xs outline-none disabled:cursor-not-allowed disabled:opacity-60"
        spellCheck={false}
        value={props.markdownText}
        disabled={!props.ready || props.phase === 'conflict'}
        onChange={(event) => props.onChangeText(event.target.value)}
      />

      {props.phase === 'editing' ? (
        <div className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2">
          <Button size="sm" variant="primary" onPress={props.onSync}>
            Sync
          </Button>
          <Button size="sm" variant="secondary" onPress={props.onDiscard}>
            Discard
          </Button>
          <span className="ms-auto text-[11px] text-gray-400 dark:text-gray-500">
            read taken · the document stays editable
          </span>
        </div>
      ) : null}

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
    </section>
  )
}

function chipLabel(value: MarkdownLoopChip): string {
  switch (value) {
    case 'following':
      return 'following'
    case 'editing':
      return 'editing · read taken'
    case 'conflict':
      return 'conflict'
    case 'synced':
      return 'synced ✓'
  }
}

function RisingCard(props: {children: React.ReactNode}) {
  return (
    <div className="animate-[markdown-loop-rise_0.18s_ease-out] absolute inset-x-2 bottom-2 flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-red-400 dark:border-l-red-500 bg-white dark:bg-gray-800 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-200 shadow-lg">
      {props.children}
    </div>
  )
}
