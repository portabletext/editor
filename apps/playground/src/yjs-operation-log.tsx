import type {YjsOperationEntry} from '@portabletext/editor/yjs'
import {TrashIcon} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'

const MAX_ENTRIES = 200

type LogEntry = YjsOperationEntry & {id: number}

type YjsOperationLogContextValue = {
  entries: LogEntry[]
  addEntry: (entry: YjsOperationEntry) => void
  clear: () => void
}

const YjsOperationLogContext = createContext<YjsOperationLogContextValue>({
  entries: [],
  addEntry: () => {},
  clear: () => {},
})

let nextId = 0

export function YjsOperationLogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [entries, setEntries] = useState<LogEntry[]>([])

  const addEntry = useCallback((entry: YjsOperationEntry) => {
    setEntries((prev) => {
      const next = [{...entry, id: nextId++}, ...prev]
      if (next.length > MAX_ENTRIES) {
        return next.slice(0, MAX_ENTRIES)
      }
      return next
    })
  }, [])

  const clear = useCallback(() => setEntries([]), [])

  return (
    <YjsOperationLogContext.Provider value={{entries, addEntry, clear}}>
      {children}
    </YjsOperationLogContext.Provider>
  )
}

export function useYjsOperationLog() {
  return useContext(YjsOperationLogContext)
}

export function YjsOperationLog() {
  const {entries, clear} = useYjsOperationLog()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [entries.length])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 flex-shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {entries.length} operation{entries.length !== 1 ? 's' : ''}
        </span>
        <TooltipTrigger>
          <Button variant="ghost" size="sm" onPress={clear}>
            <TrashIcon className="size-3" />
          </Button>
          <Tooltip>Clear log</Tooltip>
        </TooltipTrigger>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xs">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            No operations yet
          </div>
        ) : (
          <div className="space-y-px p-1">
            {entries.map((entry) => (
              <OperationEntryView key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OperationEntryView({entry}: {entry: LogEntry}) {
  const [expanded, setExpanded] = useState(false)
  const isLocal = entry.direction === 'local-to-yjs'

  return (
    <div className="rounded hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left px-1 py-0.5"
      >
        <span className="text-gray-400 w-3 shrink-0">
          {expanded ? '▾' : '▸'}
        </span>
        <span
          className={`shrink-0 px-1 rounded text-[10px] font-medium ${
            isLocal
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
          }`}
        >
          {isLocal ? '\u2192 Yjs' : '\u2192 Slate'}
        </span>
        <span className="text-gray-600 dark:text-gray-300">
          {entry.operations.length} op{entry.operations.length !== 1 ? 's' : ''}
        </span>
        <span className="text-gray-400 ml-auto">
          {formatTime(entry.timestamp)}
        </span>
      </button>
      {expanded && (
        <div className="pl-6 pb-1 space-y-0.5">
          {entry.operations.map((op, index) => (
            <div key={index} className="text-gray-500 dark:text-gray-400">
              <span className="text-purple-600 dark:text-purple-400">
                {op.type}
              </span>
              {'path' in op ? (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  [{(op.path as number[]).join(', ')}]
                </span>
              ) : null}
              {'text' in op && typeof op.text === 'string' ? (
                <span className="text-green-600 dark:text-green-400 ml-1">
                  &quot;{op.text}&quot;
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 1,
  } as Intl.DateTimeFormatOptions)
}
