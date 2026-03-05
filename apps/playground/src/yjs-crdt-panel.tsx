import {TrashIcon} from 'lucide-react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './primitives/button'
import {Tooltip} from './primitives/tooltip'
import {
  useCrdtEvents,
  type CrdtEvent,
  type InFlightUpdate,
} from './yjs-latency-provider'

const MAX_EVENTS = 200
const POLL_INTERVAL_MS = 100

export function YjsCrdtPanel() {
  const {subscribeToCrdtEvents, getInFlightUpdates} = useCrdtEvents()
  const [events, setEvents] = useState<CrdtEvent[]>([])
  const [inFlight, setInFlight] = useState<InFlightUpdate[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeToCrdtEvents((event) => {
      setEvents((prev) => {
        const next = [event, ...prev]
        if (next.length > MAX_EVENTS) {
          return next.slice(0, MAX_EVENTS)
        }
        return next
      })
    })
  }, [subscribeToCrdtEvents])

  useEffect(() => {
    const interval = setInterval(() => {
      setInFlight([...getInFlightUpdates()])
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [getInFlightUpdates])

  const clearEvents = useCallback(() => setEvents([]), [])

  const isConverged = inFlight.length === 0

  return (
    <div className="flex flex-col h-full">
      <StatusBar isConverged={isConverged} inFlightCount={inFlight.length} />
      {inFlight.length > 0 ? <PacketLanes inFlight={inFlight} /> : null}
      <EventLog
        events={events}
        scrollRef={scrollRef}
        clearEvents={clearEvents}
      />
    </div>
  )
}

function StatusBar({
  isConverged,
  inFlightCount,
}: {
  isConverged: boolean
  inFlightCount: number
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      {isConverged ? (
        <>
          <span className="size-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Converged
          </span>
        </>
      ) : (
        <>
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Diverged
          </span>
        </>
      )}
      <span className="text-xs text-gray-400 ml-auto">
        {inFlightCount} in-flight
      </span>
    </div>
  )
}

function PacketLanes({inFlight}: {inFlight: InFlightUpdate[]}) {
  const lanes = new Map<string, InFlightUpdate[]>()
  for (const update of inFlight) {
    const key = `${update.sourceEditor}-${update.targetEditor}`
    const existing = lanes.get(key)
    if (existing) {
      existing.push(update)
    } else {
      lanes.set(key, [update])
    }
  }

  return (
    <div className="px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 space-y-1">
      {Array.from(lanes.entries()).map(([key, updates]) => (
        <PacketLane key={key} updates={updates} />
      ))}
    </div>
  )
}

function PacketLane({updates}: {updates: InFlightUpdate[]}) {
  const {sourceEditor, targetEditor} = updates[0]!
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-gray-500 w-8 shrink-0">Ed {sourceEditor}</span>
      <span className="text-gray-400">{'\u2500'}</span>
      <div className="flex items-center gap-1">
        {updates.map((update) => {
          const remaining = Math.max(0, update.deliverAt - now)
          return (
            <span key={update.id} className="inline-flex items-center gap-0.5">
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-600 dark:text-blue-400 text-[10px]">
                {remaining > 0 ? `${(remaining / 1000).toFixed(1)}s` : '...'}
              </span>
            </span>
          )
        })}
      </div>
      <span className="text-gray-400">{'\u2500\u25B6'}</span>
      <span className="text-gray-500">Ed {targetEditor}</span>
    </div>
  )
}

function EventLog({
  events,
  scrollRef,
  clearEvents,
}: {
  events: CrdtEvent[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  clearEvents: () => void
}) {
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [events.length, scrollRef])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-2 py-1 flex-shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
        <TooltipTrigger>
          <Button variant="ghost" size="sm" onPress={clearEvents}>
            <TrashIcon className="size-3" />
          </Button>
          <Tooltip>Clear log</Tooltip>
        </TooltipTrigger>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-xs">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            No events yet
          </div>
        ) : (
          <div className="space-y-px p-1">
            {events.map((event) => (
              <EventEntry key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventEntry({event}: {event: CrdtEvent}) {
  const isSend = event.type === 'send'
  const isConcurrentSend = isSend && event.latencyMs > 0

  return (
    <div
      className={`flex items-center gap-1.5 px-1 py-0.5 rounded ${
        isConcurrentSend
          ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <span className="text-gray-400 shrink-0">
        {formatTime(event.timestamp)}
      </span>
      <span
        className={`shrink-0 px-1 rounded text-[10px] font-medium ${
          isSend
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
        }`}
      >
        {isSend ? 'send' : 'deliver'}
      </span>
      <span className="text-gray-600 dark:text-gray-300">
        Ed {event.sourceEditor} {'\u2192'} Ed {event.targetEditor}
      </span>
      {isSend && event.latencyMs > 0 ? (
        <span className="text-amber-600 dark:text-amber-400 text-[10px]">
          {'\u23F3'} {event.latencyMs}ms
        </span>
      ) : null}
      {event.type === 'deliver' ? (
        <span className="text-green-600 dark:text-green-400 text-[10px]">
          {'\u2713'}
        </span>
      ) : null}
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
