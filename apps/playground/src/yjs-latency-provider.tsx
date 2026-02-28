import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import * as Y from 'yjs'

type LatencyDoc = {
  doc: Y.Doc
  sharedRoot: Y.XmlText
}

export type InFlightUpdate = {
  id: number
  sourceEditor: number
  targetEditor: number
  sentAt: number
  deliverAt: number
}

export type CrdtEvent = {
  id: number
  type: 'send' | 'deliver'
  timestamp: number
  sourceEditor: number
  targetEditor: number
  latencyMs: number
}

type CrdtEventCallback = (event: CrdtEvent) => void

type LatencyContextValue = {
  getSharedRoot: (editorIndex: number) => Y.XmlText
  subscribeToCrdtEvents: (callback: CrdtEventCallback) => () => void
  getInFlightUpdates: () => InFlightUpdate[]
  setOffline: (editorIndex: number, offline: boolean) => void
  isOffline: (editorIndex: number) => boolean
}

const LatencyContext = createContext<LatencyContextValue>({
  getSharedRoot: () => {
    throw new Error('LatencyYjsProvider not mounted')
  },
  subscribeToCrdtEvents: () => () => {},
  getInFlightUpdates: () => [],
  setOffline: () => {},
  isOffline: () => false,
})

export function useLatencySharedRoot(editorIndex: number): Y.XmlText {
  const {getSharedRoot} = useContext(LatencyContext)
  return getSharedRoot(editorIndex)
}

export function useCrdtEvents() {
  const {subscribeToCrdtEvents, getInFlightUpdates} = useContext(LatencyContext)
  return {subscribeToCrdtEvents, getInFlightUpdates}
}

export function useEditorOffline() {
  const {setOffline, isOffline} = useContext(LatencyContext)
  return {setOffline, isOffline}
}

function createDocs(count: number): LatencyDoc[] {
  return Array.from({length: count}, () => {
    const doc = new Y.Doc()
    const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText
    return {doc, sharedRoot}
  })
}

let nextUpdateId = 0
let nextEventId = 0

export function LatencyYjsProvider({
  editorCount,
  latencyMs,
  children,
}: {
  editorCount: number
  latencyMs: number
  children: React.ReactNode
}) {
  const latencyMsRef = useRef(latencyMs)
  latencyMsRef.current = latencyMs

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const inFlightRef = useRef<InFlightUpdate[]>([])
  const subscribersRef = useRef<Set<CrdtEventCallback>>(new Set())
  const offlineEditorsRef = useRef<Set<number>>(new Set())

  // Use a ref for docs so they survive React strict mode's unmount/remount
  // cycle. useState preserves the value across remount, but useEffect cleanup
  // would destroy the Y.Docs, leaving the state with dead references.
  const docsRef = useRef<LatencyDoc[]>(createDocs(editorCount))
  if (docsRef.current.length !== editorCount) {
    for (const {doc} of docsRef.current) {
      doc.destroy()
    }
    docsRef.current = createDocs(editorCount)
  }

  const notifySubscribers = useCallback((event: CrdtEvent) => {
    for (const callback of subscribersRef.current) {
      callback(event)
    }
  }, [])

  // Register cross-doc sync handlers. When any Y.Doc emits an update,
  // forward it to all other docs with the configured latency delay.
  useEffect(() => {
    const docs = docsRef.current
    const handlers: Array<{
      doc: Y.Doc
      handler: (update: Uint8Array, origin: unknown) => void
    }> = []

    for (let sourceIndex = 0; sourceIndex < docs.length; sourceIndex++) {
      const sourceDoc = docs[sourceIndex]!.doc
      const handler = (update: Uint8Array, origin: unknown) => {
        if (origin === 'remote') {
          return
        }

        const delay = latencyMsRef.current
        const now = Date.now()

        for (let targetIndex = 0; targetIndex < docs.length; targetIndex++) {
          if (targetIndex === sourceIndex) {
            continue
          }

          if (
            offlineEditorsRef.current.has(sourceIndex) ||
            offlineEditorsRef.current.has(targetIndex)
          ) {
            continue
          }

          const targetDoc = docs[targetIndex]!.doc

          if (delay === 0) {
            Y.applyUpdate(targetDoc, update, 'remote')

            const eventId = nextEventId++
            notifySubscribers({
              id: eventId,
              type: 'send',
              timestamp: now,
              sourceEditor: sourceIndex,
              targetEditor: targetIndex,
              latencyMs: 0,
            })
            notifySubscribers({
              id: nextEventId++,
              type: 'deliver',
              timestamp: now,
              sourceEditor: sourceIndex,
              targetEditor: targetIndex,
              latencyMs: 0,
            })
          } else {
            const updateId = nextUpdateId++
            const inFlight: InFlightUpdate = {
              id: updateId,
              sourceEditor: sourceIndex,
              targetEditor: targetIndex,
              sentAt: now,
              deliverAt: now + delay,
            }
            inFlightRef.current.push(inFlight)

            notifySubscribers({
              id: nextEventId++,
              type: 'send',
              timestamp: now,
              sourceEditor: sourceIndex,
              targetEditor: targetIndex,
              latencyMs: delay,
            })

            const timer = setTimeout(() => {
              Y.applyUpdate(targetDoc, update, 'remote')

              inFlightRef.current = inFlightRef.current.filter(
                (entry) => entry.id !== updateId,
              )

              notifySubscribers({
                id: nextEventId++,
                type: 'deliver',
                timestamp: Date.now(),
                sourceEditor: sourceIndex,
                targetEditor: targetIndex,
                latencyMs: delay,
              })
            }, delay)
            timersRef.current.push(timer)
          }
        }
      }

      sourceDoc.on('update', handler)
      handlers.push({doc: sourceDoc, handler})
    }

    return () => {
      for (const {doc, handler} of handlers) {
        doc.off('update', handler)
      }
      for (const timer of timersRef.current) {
        clearTimeout(timer)
      }
      timersRef.current = []
      inFlightRef.current = []
    }
  }, [editorCount, notifySubscribers])

  const getSharedRoot = useMemo(
    () => (editorIndex: number) => {
      const entry = docsRef.current[editorIndex]
      if (!entry) {
        throw new Error(`No latency doc for editor index ${editorIndex}`)
      }
      return entry.sharedRoot
    },
    [],
  )

  const setOffline = useCallback((editorIndex: number, offline: boolean) => {
    if (offline) {
      offlineEditorsRef.current.add(editorIndex)
    } else {
      offlineEditorsRef.current.delete(editorIndex)

      // Sync diverged state: exchange missing updates between the
      // reconnecting editor and all other online editors.
      const docs = docsRef.current
      const reconnectedDoc = docs[editorIndex]?.doc
      if (!reconnectedDoc) return

      for (let other = 0; other < docs.length; other++) {
        if (other === editorIndex || offlineEditorsRef.current.has(other)) {
          continue
        }
        const otherDoc = docs[other]?.doc
        if (!otherDoc) continue

        // Send updates the other doc is missing from the reconnected doc
        const otherStateVector = Y.encodeStateVector(otherDoc)
        const missingOnOther = Y.encodeStateAsUpdate(
          reconnectedDoc,
          otherStateVector,
        )
        Y.applyUpdate(otherDoc, missingOnOther, 'remote')

        // Send updates the reconnected doc is missing from the other doc
        const reconnectedStateVector = Y.encodeStateVector(reconnectedDoc)
        const missingOnReconnected = Y.encodeStateAsUpdate(
          otherDoc,
          reconnectedStateVector,
        )
        Y.applyUpdate(reconnectedDoc, missingOnReconnected, 'remote')
      }
    }
  }, [])

  const isOffline = useCallback((editorIndex: number) => {
    return offlineEditorsRef.current.has(editorIndex)
  }, [])

  const subscribeToCrdtEvents = useCallback((callback: CrdtEventCallback) => {
    subscribersRef.current.add(callback)
    return () => {
      subscribersRef.current.delete(callback)
    }
  }, [])

  const getInFlightUpdates = useCallback(() => {
    return inFlightRef.current
  }, [])

  const contextValue = useMemo<LatencyContextValue>(
    () => ({
      getSharedRoot,
      subscribeToCrdtEvents,
      getInFlightUpdates,
      setOffline,
      isOffline,
    }),
    [
      getSharedRoot,
      subscribeToCrdtEvents,
      getInFlightUpdates,
      setOffline,
      isOffline,
    ],
  )

  return (
    <LatencyContext.Provider value={contextValue}>
      {children}
    </LatencyContext.Provider>
  )
}
