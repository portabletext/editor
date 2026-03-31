import type {RangeDecorationShift} from '@portabletext/editor'
import {ChevronRightIcon, HistoryIcon} from 'lucide-react'
import {useState} from 'react'
import {tv} from 'tailwind-variants'
import type {GlobalPatchEntry} from './playground-machine'

const patchCardStyle = tv({
  base: 'w-full text-left p-2 rounded-md border transition-colors duration-150 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600',
  variants: {
    isNew: {
      true: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700',
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
      moved:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      contentChanged:
        'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
      default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    },
  },
})

const editorBadgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    isNew: {
      true: 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300',
      false: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    },
  },
})

type FlattenedPatch = {
  kind: 'patch'
  id: string
  editorId: string
  timestamp: number
  patch: GlobalPatchEntry['patches'][number]
  isNew: boolean
}

type FlattenedShift = {
  kind: 'shift'
  id: string
  editorId: string
  timestamp: number
  shift: RangeDecorationShift
  isNew: boolean
}

type FlattenedItem = FlattenedPatch | FlattenedShift

function flattenEntries(
  entries: Array<GlobalPatchEntry>,
): Array<FlattenedItem> {
  if (entries.length === 0) {
    return []
  }

  const newestTimestamp = entries[0]?.timestamp

  return entries.flatMap((entry) => {
    const isNew = entry.timestamp === newestTimestamp
    const items: Array<FlattenedItem> = []

    for (const [index, patch] of [...entry.patches].reverse().entries()) {
      items.push({
        kind: 'patch',
        id: `${entry.id}-p${index}`,
        editorId: entry.editorId,
        timestamp: entry.timestamp,
        patch,
        isNew,
      })
    }

    for (const [index, shift] of entry.rangeDecorationShifts.entries()) {
      items.push({
        kind: 'shift',
        id: `${entry.id}-s${index}`,
        editorId: entry.editorId,
        timestamp: entry.timestamp,
        shift,
        isNew,
      })
    }

    return items
  })
}

export function PatchesList(props: {
  entries: Array<GlobalPatchEntry>
  showEditorLabel: boolean
}) {
  const items = flattenEntries(props.entries)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <HistoryIcon className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No patches yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see patches
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto">
      {items.map((item) =>
        item.kind === 'patch' ? (
          <PatchCard
            key={item.id}
            item={item}
            showEditorLabel={props.showEditorLabel}
          />
        ) : (
          <ShiftCard
            key={item.id}
            item={item}
            showEditorLabel={props.showEditorLabel}
          />
        ),
      )}
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
          className={`size-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
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

function serializeShift(shift: RangeDecorationShift): object {
  const {rangeDecoration, ...rest} = shift
  const {
    component: _component,
    onMoved: _onMoved,
    ...serializableDecoration
  } = rangeDecoration
  return {...rest, rangeDecoration: serializableDecoration}
}

function formatSelection(
  selection: RangeDecorationShift['previousSelection'],
): string {
  if (!selection) {
    return 'null'
  }
  return `[${JSON.stringify(selection.anchor.path)},${selection.anchor.offset}]..[${JSON.stringify(selection.focus.path)},${selection.focus.offset}]`
}

function ShiftCard(props: {item: FlattenedShift; showEditorLabel: boolean}) {
  const {item, showEditorLabel} = props
  const [isExpanded, setIsExpanded] = useState(false)
  const {shift} = item
  const decorationId = String(
    shift.rangeDecoration.id ?? shift.rangeDecoration.payload?.id ?? '',
  )

  return (
    <button
      type="button"
      className={patchCardStyle({isNew: item.isNew})}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-1.5">
        <ChevronRightIcon
          className={`size-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
        {showEditorLabel && (
          <span className={editorBadgeStyle({isNew: item.isNew})}>
            {item.editorId}
          </span>
        )}
        <span className={typeBadgeStyle({type: shift.reason})}>
          {shift.reason}
        </span>
        <span className={typeBadgeStyle({type: 'default'})}>
          {shift.origin}
        </span>
        {decorationId && (
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
            {decorationId}
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
          {new Date(item.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {isExpanded ? (
        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all mt-2">
          {JSON.stringify(serializeShift(shift), null, 2)}
        </pre>
      ) : (
        <>
          <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate mt-1">
            <span className="text-gray-400 dark:text-gray-500">prev:</span>{' '}
            {formatSelection(shift.previousSelection)}
          </div>
          <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
            <span className="text-gray-400 dark:text-gray-500">next:</span>{' '}
            {formatSelection(shift.newSelection)}
          </div>
        </>
      )}
    </button>
  )
}
