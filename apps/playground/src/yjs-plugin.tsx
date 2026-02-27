import {useEditor} from '@portabletext/editor'
import {createYjsPlugin} from '@portabletext/plugin-yjs'
import {useContext, useEffect, useState} from 'react'
import * as Y from 'yjs'
import {PlaygroundFeatureFlagsContext} from './feature-flags'

// Shared Y.Doc — all editors connect to the same doc
const sharedYDoc = new Y.Doc()

/**
 * Playground Yjs plugin component.
 * Connects an editor to the shared Y.Doc for CRDT sync.
 */
export function PlaygroundYjsPlugin(props: {
  editorIndex: number
  useLatency?: boolean
}) {
  const featureFlags = useContext(PlaygroundFeatureFlagsContext)
  const editor = useEditor()

  useEffect(() => {
    if (!featureFlags.yjsMode) {
      return
    }

    const localOrigin = `editor-${props.editorIndex}`

    let yDoc: Y.Doc
    let cleanup: (() => void) | undefined

    if (props.useLatency && featureFlags.yjsLatency > 0) {
      // Latency simulation: each editor gets its own Y.Doc synced with delay
      yDoc = new Y.Doc()

      const handleSharedUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === localOrigin) {
          return
        }
        setTimeout(() => {
          Y.applyUpdate(yDoc, update)
        }, featureFlags.yjsLatency)
      }

      const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === localOrigin) {
          setTimeout(() => {
            Y.applyUpdate(sharedYDoc, update, localOrigin)
          }, featureFlags.yjsLatency)
        }
      }

      sharedYDoc.on('update', handleSharedUpdate)
      yDoc.on('update', handleLocalUpdate)

      cleanup = () => {
        sharedYDoc.off('update', handleSharedUpdate)
        yDoc.off('update', handleLocalUpdate)
      }
    } else {
      yDoc = sharedYDoc
    }

    const plugin = createYjsPlugin({
      editor,
      yDoc,
      localOrigin,
    })

    plugin.connect()

    return () => {
      plugin.disconnect()
      cleanup?.()
    }
  }, [
    editor,
    featureFlags.yjsMode,
    featureFlags.yjsLatency,
    props.editorIndex,
    props.useLatency,
  ])

  return null
}

/**
 * Y.Doc viewer for the inspector panel.
 */
export function YjsTreeViewer() {
  const [tree, setTree] = useState<string>('')

  useEffect(() => {
    const update = () => {
      const patchesArray = sharedYDoc.getArray<string>('patches')
      const lines: string[] = []
      lines.push(`Y.Doc — patches array (${patchesArray.length} entries)`)
      lines.push('')

      // Show last 20 entries
      const start = Math.max(0, patchesArray.length - 20)
      for (let i = start; i < patchesArray.length; i++) {
        try {
          const entry = JSON.parse(patchesArray.get(i))
          const patch = entry.patch
          lines.push(
            `[${i}] ${patch.type} @ ${JSON.stringify(patch.path).slice(0, 60)}`,
          )
        } catch {
          lines.push(`[${i}] (parse error)`)
        }
      }

      setTree(lines.join('\n'))
    }

    update()
    sharedYDoc.on('update', update)
    return () => {
      sharedYDoc.off('update', update)
    }
  }, [])

  return (
    <pre className="text-xs font-mono whitespace-pre-wrap overflow-auto h-full p-2">
      {tree || 'Y.Doc is empty. Enable Yjs mode and start typing.'}
    </pre>
  )
}

/**
 * Reset the shared Y.Doc
 */
export function resetSharedYDoc() {
  const patchesArray = sharedYDoc.getArray<string>('patches')
  sharedYDoc.transact(() => {
    patchesArray.delete(0, patchesArray.length)
  })
}
