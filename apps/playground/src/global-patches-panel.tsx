import {useSelector} from '@xstate/react'
import {CopyIcon, TrashIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {tv} from 'tailwind-variants'
import type {GlobalPatchEntry, PlaygroundActorRef} from './playground-machine'
import {Button} from './primitives/button'
import {Container} from './primitives/container'
import {Tooltip} from './primitives/tooltip'

const patchCardStyle = tv({
  base: 'p-2 rounded-md border transition-colors',
  variants: {
    isNew: {
      true: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
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

  return (
    <Container className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Patches
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
      <PatchFeedList entries={patchFeed} />
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

function PatchFeedList(props: {entries: Array<GlobalPatchEntry>}) {
  const flatPatches = flattenPatches(props.entries)

  if (flatPatches.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic p-2">
        No patches yet
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto">
      {flatPatches.map((item) => (
        <PatchCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function getPatchValue(patch: GlobalPatchEntry['patches'][number]): unknown {
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

function PatchCard(props: {item: FlattenedPatch}) {
  const {item} = props
  const value = getPatchValue(item.patch)

  return (
    <div className={patchCardStyle({isNew: item.isNew})}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={editorBadgeStyle({isNew: item.isNew})}>
          {item.editorId}
        </span>
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
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {new Date(item.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
        <span className="text-gray-400 dark:text-gray-500">path:</span>{' '}
        <span title={JSON.stringify(item.patch.path)}>
          {JSON.stringify(item.patch.path)}
        </span>
      </div>
      {value !== undefined && (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
          <span className="text-gray-400 dark:text-gray-500">value:</span>{' '}
          <span title={JSON.stringify(value, null, 2)}>
            {JSON.stringify(value)}
          </span>
        </div>
      )}
    </div>
  )
}
