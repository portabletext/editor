import {useActorRef, useSelector} from '@xstate/react'
import {ChevronRightIcon, GitCommitHorizontalIcon} from 'lucide-react'
import {useState} from 'react'
import {tv} from 'tailwind-variants'
import {highlightMachine} from './highlight-json-machine'
import type {ChangeFeedEntry} from './playground-machine'

const changeCardStyle = tv({
  base: 'rounded-md border transition-colors duration-150',
  variants: {
    isNew: {
      true: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
      false:
        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    },
  },
})

const badgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    kind: {
      local: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      remote:
        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      correction:
        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      editor: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    },
  },
})

export function ChangesList(props: {
  entries: Array<ChangeFeedEntry>
  showEditorLabel: boolean
}) {
  if (props.entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <GitCommitHorizontalIcon className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No changes yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see changes
        </p>
      </div>
    )
  }

  const newestTimestamp = props.entries[0]?.timestamp

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto">
      {props.entries.map((entry) => (
        <ChangeCard
          key={entry.id}
          entry={entry}
          isNew={entry.timestamp === newestTimestamp}
          showEditorLabel={props.showEditorLabel}
        />
      ))}
    </div>
  )
}

function ChangeCard(props: {
  entry: ChangeFeedEntry
  isNew: boolean
  showEditorLabel: boolean
}) {
  const {entry} = props
  const [isExpanded, setIsExpanded] = useState(false)
  const operationCount = entry.event.operations.length

  return (
    <div className={changeCardStyle({isNew: props.isNew})}>
      <button
        type="button"
        className="w-full flex items-center gap-1.5 p-2 text-left cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRightIcon
          className={`size-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
        {props.showEditorLabel ? (
          <span className={badgeStyle({kind: 'editor'})}>{entry.editorId}</span>
        ) : null}
        <span className={badgeStyle({kind: entry.event.origin})}>
          {entry.event.origin}
        </span>
        {entry.event.origin === 'local' && entry.event.correction ? (
          <span className={badgeStyle({kind: 'correction'})}>correction</span>
        ) : null}
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {operationCount} {operationCount === 1 ? 'operation' : 'operations'}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </button>
      {isExpanded ? (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <HighlightedJson label="Operations" data={entry.event.operations} />
          {entry.event.origin === 'local' ? (
            <HighlightedJson label="Patches" data={entry.event.patches} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function HighlightedJson(props: {label: string; data: unknown}) {
  const highlightRef = useActorRef(highlightMachine, {
    input: {code: JSON.stringify(props.data), variant: 'ghost'},
  })
  const highlightedCode = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )

  return (
    <div className="rounded bg-gray-50 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
        {props.label}
      </div>
      <div
        className="overflow-auto text-xs [&>pre]:p-2 [&>pre]:m-0"
        dangerouslySetInnerHTML={{__html: highlightedCode ?? ''}}
      />
    </div>
  )
}
