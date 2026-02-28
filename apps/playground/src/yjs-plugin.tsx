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
 * Shows the XmlFragment structure: blocks as XmlText with attributes and delta.
 */
export function YjsTreeViewer() {
  const [tree, setTree] = useState<string>('')

  useEffect(() => {
    const update = () => {
      const root = sharedYDoc.getXmlFragment('content')
      const lines: string[] = []
      lines.push(`Y.Doc — XmlFragment "content" (${root.length} blocks)`)
      lines.push('')

      for (let i = 0; i < root.length; i++) {
        const child = root.get(i)
        if (child instanceof Y.XmlText) {
          const attrs = child.getAttributes()
          const key = attrs._key ?? '?'
          const type = attrs._type ?? '?'
          const style = attrs.style ?? ''
          const listItem = attrs.listItem ? ` [${attrs.listItem}]` : ''

          lines.push(`[${i}] ${type} _key="${key}" style="${style}"${listItem}`)

          // Show delta (spans)
          const delta = child.toDelta() as Array<{
            insert: string | Y.XmlText
            attributes?: Record<string, unknown>
          }>
          for (const entry of delta) {
            if (typeof entry.insert === 'string') {
              const spanKey = entry.attributes?._key ?? '?'
              const marks = entry.attributes?.marks ?? '[]'
              const text =
                entry.insert.length > 40
                  ? `${entry.insert.slice(0, 40)}…`
                  : entry.insert
              lines.push(`  span _key="${spanKey}" marks=${marks}`)
              lines.push(`    "${text}"`)
            }
          }

          // Show markDefs if present
          const markDefs = attrs.markDefs
          if (markDefs && markDefs !== '[]') {
            lines.push(`  markDefs: ${markDefs}`)
          }

          lines.push('')
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
  const root = sharedYDoc.getXmlFragment('content')
  sharedYDoc.transact(() => {
    if (root.length > 0) {
      root.delete(0, root.length)
    }
  })
}
