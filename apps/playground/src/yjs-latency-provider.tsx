import {createContext, useContext, useEffect, useMemo, useRef} from 'react'
import * as Y from 'yjs'

type LatencyDoc = {
  doc: Y.Doc
  sharedRoot: Y.XmlText
}

type LatencyContextValue = {
  docs: LatencyDoc[]
  getSharedRoot: (editorIndex: number) => Y.XmlText
}

const LatencyContext = createContext<LatencyContextValue>({
  docs: [],
  getSharedRoot: () => {
    throw new Error('LatencyYjsProvider not mounted')
  },
})

export function useLatencySharedRoot(editorIndex: number): Y.XmlText {
  const {getSharedRoot} = useContext(LatencyContext)
  return getSharedRoot(editorIndex)
}

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

  // Create per-editor Y.Docs and register cross-sync handlers in the same
  // useMemo. Handlers must exist synchronously before any child useEffect
  // runs, because React fires child effects before parent effects. If the
  // handlers were set up in a useEffect, the editors would connect() and push
  // their Slate content to independent Y.Docs before any cross-sync existed,
  // causing duplicate content when the delayed sync eventually arrived.
  const docs = useMemo(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer)
    }
    timersRef.current = []

    const newDocs = Array.from({length: editorCount}, () => {
      const doc = new Y.Doc()
      const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText
      return {doc, sharedRoot}
    })

    // Track whether each doc has sent its first update. The first update
    // from each doc is the initial state push from `connect()`. This must
    // sync immediately so all docs start with the same content. Subsequent
    // updates (actual edits) use the configured latency delay.
    const hasBootstrapped = new Set<number>()

    for (let sourceIndex = 0; sourceIndex < newDocs.length; sourceIndex++) {
      const source = newDocs[sourceIndex]!

      source.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin === 'remote') return

        const isBootstrap = !hasBootstrapped.has(sourceIndex)
        if (isBootstrap) {
          hasBootstrapped.add(sourceIndex)
        }

        const delay = isBootstrap ? 0 : latencyMsRef.current

        for (let targetIndex = 0; targetIndex < newDocs.length; targetIndex++) {
          if (targetIndex === sourceIndex) continue

          const targetDoc = newDocs[targetIndex]!.doc
          if (delay === 0) {
            Y.applyUpdate(targetDoc, update, 'remote')
          } else {
            const timer = setTimeout(() => {
              Y.applyUpdate(targetDoc, update, 'remote')
            }, delay)
            timersRef.current.push(timer)
          }
        }
      })
    }

    return newDocs
  }, [editorCount])

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        clearTimeout(timer)
      }
      for (const {doc} of docs) {
        doc.destroy()
      }
    }
  }, [docs])

  const contextValue = useMemo(
    () => ({
      docs,
      getSharedRoot: (editorIndex: number) => {
        const entry = docs[editorIndex]
        if (!entry) {
          throw new Error(`No latency doc for editor index ${editorIndex}`)
        }
        return entry.sharedRoot
      },
    }),
    [docs],
  )

  return (
    <LatencyContext.Provider value={contextValue}>
      {children}
    </LatencyContext.Provider>
  )
}
