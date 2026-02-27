import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type * as Y from 'yjs'
import type {YjsPluginConfig, YjsPluginInstance} from './types'

/**
 * Create a Yjs plugin for the Portable Text Editor.
 *
 * Listens to granular `patch` events from the editor and stores them
 * in a Y.Array. Remote clients observe the Y.Array and inject the
 * patches into their editor via `editor.send({ type: 'patches' })`.
 *
 * @public
 */
export function createYjsPlugin(config: YjsPluginConfig): YjsPluginInstance {
  const {editor, yDoc, localOrigin = 'local'} = config
  const patchesArray = yDoc.getArray<string>('patches')

  let isApplyingRemote = false
  let subscriptions: Array<() => void> = []

  function connect() {
    // 1. Local patches → Y.Doc
    const patchSub = editor.on('patch', (event) => {
      if (isApplyingRemote) {
        return
      }

      const patch = event.patch
      if (patch.origin !== 'local') {
        return
      }

      const snapshot = editor.getSnapshot().context.value

      yDoc.transact(() => {
        patchesArray.push([
          JSON.stringify({
            patch,
            snapshot,
          }),
        ])
      }, localOrigin)
    })

    // 2. Y.Doc → remote patches into editor
    const handleYjsChange = (event: Y.YArrayEvent<string>) => {
      if (event.transaction.origin === localOrigin) {
        return
      }

      for (const delta of event.changes.delta) {
        if (delta.insert) {
          for (const item of delta.insert as string[]) {
            try {
              const entry = JSON.parse(item) as {
                patch: Patch
                snapshot: Array<PortableTextBlock> | undefined
              }

              isApplyingRemote = true
              try {
                editor.send({
                  type: 'patches',
                  patches: [{...entry.patch, origin: 'remote' as const}],
                  snapshot: entry.snapshot,
                })
              } finally {
                isApplyingRemote = false
              }
            } catch {
              // Skip malformed entries
            }
          }
        }
      }
    }

    patchesArray.observe(handleYjsChange)

    subscriptions = [
      () => patchSub.unsubscribe(),
      () => patchesArray.unobserve(handleYjsChange),
    ]
  }

  function disconnect() {
    for (const unsub of subscriptions) {
      unsub()
    }
    subscriptions = []
  }

  return {
    connect,
    disconnect,
    yDoc,
    patchesArray,
  }
}
