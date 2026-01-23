import {useSelector} from '@xstate/react'
import {
  ActivityIcon,
  ChevronRightIcon,
  CopyIcon,
  InfoIcon,
  TrashIcon,
} from 'lucide-react'
import {useState} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import type {GlobalPatchEntry, PlaygroundActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Tooltip} from './primitives/tooltip'

const patchCardStyle = tv({
  base: 'w-full text-left p-2 rounded-md border transition-colors cursor-pointer hover:border-gray-300 dark:hover:border-gray-600',
  variants: {
    isNew: {
      true: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700',
      false:
        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    },
  },
})

const typeBadgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    type: {
      set: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      unset: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      insert:
        'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      diffMatchPatch:
        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    },
  },
})

const editorBadgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    isNew: {
      true: 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300',
      false:
        'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    },
  },
})

export function GlobalPatchesPanel(props: {playgroundRef: PlaygroundActorRef}) {
  const patchFeed = useSelector(props.playgroundRef, (s) => s.context.patchFeed)
  const editorCount = useSelector(
    props.playgroundRef,
    (s) => s.context.editors.length,
  )

  return (
    <Container className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Patches
          <TooltipTrigger delay={0}>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 size-4 min-w-0"
              aria-label="Info"
            >
              <InfoIcon className="size-3 text-gray-400 dark:text-gray-500" />
            </Button>
            <Tooltip>
              Real-time feed of patches emitted by the editor. Patches describe
              changes to the Portable Text value.
            </Tooltip>
          </TooltipTrigger>
        </span>
        <div className="flex items-center gap-1">
          <TooltipTrigger>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                props.playgroundRef.send({type: 'copy patches'})
              }}
            >
              <CopyIcon className="size-3" />
            </Button>
            <Tooltip>Copy patches</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              size="sm"
              variant="destructive"
              onPress={() => {
                props.playgroundRef.send({type: 'clear patches'})
              }}
            >
              <TrashIcon className="size-3" />
            </Button>
            <Tooltip>Clear patches</Tooltip>
          </TooltipTrigger>
        </div>
      </div>
      <PatchFeedList entries={patchFeed} showEditorLabel={editorCount > 1} />
    </Container>
  )
}

type FlattenedPatch = {
  id: string
  editorId: string
  timestamp: number
  patch: GlobalPatchEntry['patches'][number]
  isNew: boolean
}

function flattenPatches(
  entries: Array<GlobalPatchEntry>,
): Array<FlattenedPatch> {
  if (entries.length === 0) {
    return []
  }

  const newestTimestamp = entries[0]?.timestamp

  return entries.flatMap((entry) =>
    [...entry.patches].reverse().map((patch, index) => ({
      id: `${entry.id}-${index}`,
      editorId: entry.editorId,
      timestamp: entry.timestamp,
      patch,
      isNew: entry.timestamp === newestTimestamp,
    })),
  )
}

function PatchFeedList(props: {
  entries: Array<GlobalPatchEntry>
  showEditorLabel: boolean
}) {
  const flatPatches = flattenPatches(props.entries)

  if (flatPatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ActivityIcon className="size-8 text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No patches yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see patches
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto">
      {flatPatches.map((item) => (
        <PatchCard
          key={item.id}
          item={item}
          showEditorLabel={props.showEditorLabel}
        />
      ))}
    </div>
  )
}

function getPatchValue(patch: FlattenedPatch['patch']): unknown {
  if ('value' in patch) {
    return patch.value
  }
  if ('items' in patch) {
    return patch.items
  }
  if ('patch' in patch) {
    return patch.patch
  }
  return undefined
}

function PatchCard(props: {item: FlattenedPatch; showEditorLabel: boolean}) {
  const {item, showEditorLabel} = props
  const [isExpanded, setIsExpanded] = useState(false)
  const value = getPatchValue(item.patch)

  return (
    <button
      type="button"
      className={patchCardStyle({isNew: item.isNew})}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-1.5">
        <ChevronRightIcon
          className={`size-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        {showEditorLabel && (
          <span className={editorBadgeStyle({isNew: item.isNew})}>
            {item.editorId}
          </span>
        )}
        <span
          className={typeBadgeStyle({
            type: item.patch.type as
              | 'set'
              | 'unset'
              | 'insert'
              | 'diffMatchPatch'
              | 'default',
          })}
        >
          {item.patch.type}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
          {new Date(item.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {isExpanded ? (
        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all mt-2">
          {JSON.stringify(item.patch, null, 2)}
        </pre>
      ) : (
        <>
          <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate mt-1">
            <span className="text-gray-400 dark:text-gray-500">path:</span>{' '}
            {JSON.stringify(item.patch.path)}
          </div>
          {value !== undefined && (
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
              <span className="text-gray-400 dark:text-gray-500">value:</span>{' '}
              {JSON.stringify(value)}
            </div>
          )}
        </>
      )}
    </button>
  )
}
