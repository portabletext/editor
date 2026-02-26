import {createContext, useContext, useEffect, useMemo} from 'react'
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
  const docs = useMemo(() => {
    return Array.from({length: editorCount}, () => {
      const doc = new Y.Doc()
      const sharedRoot = doc.get('content', Y.XmlText) as Y.XmlText
      return {doc, sharedRoot}
    })
  }, [editorCount])

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    const handlers = docs.map((source, sourceIndex) => {
      const handler = (update: Uint8Array, origin: unknown) => {
        // Only forward updates that originate locally (not from remote sync)
        if (origin === 'remote') return

        for (let targetIndex = 0; targetIndex < docs.length; targetIndex++) {
          if (targetIndex === sourceIndex) continue

          const targetDoc = docs[targetIndex]!.doc
          const timer = setTimeout(() => {
            Y.applyUpdate(targetDoc, update, 'remote')
          }, latencyMs)
          timers.push(timer)
        }
      }

      source.doc.on('update', handler)
      return {source, handler}
    })

    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
      for (const {source, handler} of handlers) {
        source.doc.off('update', handler)
      }
    }
  }, [docs, latencyMs])

  useEffect(() => {
    return () => {
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
