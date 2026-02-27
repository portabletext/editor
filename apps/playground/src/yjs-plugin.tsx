import {useEditor} from '@portabletext/editor'
import {createYjsPlugin} from '@portabletext/plugin-yjs'
import {useContext, useEffect, useRef, useState} from 'react'
import * as Y from 'yjs'
import {PlaygroundFeatureFlagsContext} from './feature-flags'

// Shared Y.Doc context — all editors connect to the same doc
const sharedYDoc = new Y.Doc()

/**
 * Playground Yjs plugin component.
 * When yjsMode is enabled, this replaces the playground's patch-based
 * sync with Yjs CRDT sync.
 *
 * Each editor instance gets its own plugin that connects to the shared Y.Doc.
 * The first editor to connect syncs its initial state to the Y.Doc.
 */
export function PlaygroundYjsPlugin(props: {
  editorIndex: number
  useLatency?: boolean
}) {
  const featureFlags = useContext(PlaygroundFeatureFlagsContext)
  const editor = useEditor()
  const pluginRef = useRef<ReturnType<typeof createYjsPlugin> | null>(null)

  useEffect(() => {
    if (!featureFlags.yjsMode) {
      // Disconnect if Yjs mode was turned off
      if (pluginRef.current) {
        pluginRef.current.disconnect()
        pluginRef.current = null
      }
      return
    }

    // Create a unique local origin per editor to avoid echo
    const localOrigin = `editor-${props.editorIndex}`

    let yDoc: Y.Doc
    let cleanup: (() => void) | undefined

    if (props.useLatency && featureFlags.yjsLatency > 0) {
      // Latency mode: each editor gets its own Y.Doc that syncs with delay
      yDoc = new Y.Doc()

      // Sync from shared → local with delay
      const handleSharedUpdate = (update: Uint8Array, origin: unknown) => {
        if (origin === localOrigin) {
          return
        }
        setTimeout(() => {
          Y.applyUpdate(yDoc, update)
        }, featureFlags.yjsLatency)
      }

      // Sync from local → shared with delay
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
      // Direct mode: all editors share the same Y.Doc
      yDoc = sharedYDoc
    }

    const plugin = createYjsPlugin({
      editor,
      yDoc,
      localOrigin,
    })

    // Sync initial state from editor to Y.Doc (first editor wins)
    const snapshot = editor.getSnapshot()
    plugin.syncInitialState(snapshot.context.value)

    plugin.connect()
    pluginRef.current = plugin

    return () => {
      plugin.disconnect()
      pluginRef.current = null
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
 * Y.Doc tree viewer for the inspector panel.
 * Shows the current state of the shared Y.Doc.
 */
export function YjsTreeViewer() {
  const [tree, setTree] = useState<string>('')

  useEffect(() => {
    const update = () => {
      setTree(renderYDocTree(sharedYDoc))
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

function renderYDocTree(yDoc: Y.Doc): string {
  const lines: string[] = []
  lines.push('Y.Doc')

  const blocksMap = yDoc.getMap('blocks')
  const orderArray = yDoc.getArray<string>('order')

  lines.push(`├── blocks (Y.Map, ${blocksMap.size} entries)`)
  lines.push(
    `└── order (Y.Array, ${orderArray.length} entries): [${Array.from({length: orderArray.length}, (_, i) => orderArray.get(i)).join(', ')}]`,
  )

  if (blocksMap.size > 0) {
    lines.push('')
    for (const [key, value] of blocksMap.entries()) {
      lines.push(`Block "${key}":`)
      if (value instanceof Y.Map) {
        renderYMap(value, lines, '  ')
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

function renderYMap(yMap: Y.Map<any>, lines: string[], indent: string): void {
  for (const [key, value] of yMap.entries()) {
    if (value instanceof Y.Text) {
      lines.push(`${indent}${key}: Y.Text("${value.toString()}")`)
    } else if (value instanceof Y.Map) {
      lines.push(`${indent}${key}: Y.Map`)
      renderYMap(value, lines, `${indent}  `)
    } else if (value instanceof Y.Array) {
      lines.push(`${indent}${key}: Y.Array (${value.length} items)`)
      renderYArray(value, lines, `${indent}  `)
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${indent}${key}: ${JSON.stringify(value)}`)
    } else {
      lines.push(`${indent}${key}: ${JSON.stringify(value)}`)
    }
  }
}

function renderYArray(
  yArray: Y.Array<any>,
  lines: string[],
  indent: string,
): void {
  for (let i = 0; i < yArray.length; i++) {
    const item = yArray.get(i)
    if (item instanceof Y.Map) {
      lines.push(`${indent}[${i}]: Y.Map`)
      renderYMap(item, lines, `${indent}  `)
    } else if (item instanceof Y.Text) {
      lines.push(`${indent}[${i}]: Y.Text("${item.toString()}")`)
    } else {
      lines.push(`${indent}[${i}]: ${JSON.stringify(item)}`)
    }
  }
}

/**
 * Reset the shared Y.Doc (useful when toggling Yjs mode)
 */
export function resetSharedYDoc() {
  const blocksMap = sharedYDoc.getMap('blocks')
  const orderArray = sharedYDoc.getArray<string>('order')
  sharedYDoc.transact(() => {
    blocksMap.forEach((_: any, key: string) => {
      blocksMap.delete(key)
    })
    orderArray.delete(0, orderArray.length)
  })
}
