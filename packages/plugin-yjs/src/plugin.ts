import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import * as Y from 'yjs'
import {applyPatchToYDoc, blockToYText} from './apply-to-ydoc'
import {createKeyMap} from './key-map'
import type {YjsPluginConfig, YjsPluginInstance} from './types'
import {ydocToPatches} from './ydoc-to-patches'

/**
 * Create a Yjs plugin for the Portable Text Editor.
 *
 * Uses Y.XmlFragment as the root container with Y.XmlText blocks:
 * - Root XmlFragment contains blocks as Y.XmlText children
 * - Each block's Y.XmlText has attributes (_key, _type, style, etc.)
 *   and delta content (spans as text inserts with _key, marks attributes)
 * - Text edits use Y.Text character-level CRDT merging
 *
 * @public
 */
export function createYjsPlugin(config: YjsPluginConfig): YjsPluginInstance {
  const {editor, yDoc, localOrigin = 'local'} = config
  const root = yDoc.getXmlFragment('content')
  const keyMap = createKeyMap()

  let isApplyingRemote = false
  let subscriptions: Array<() => void> = []

  /**
   * Sync editor value to Y.Doc on connect.
   * Only runs if Y.Doc is empty (first editor to connect wins).
   */
  function syncInitialState(): void {
    const snapshot = editor.getSnapshot().context.value
    if (!snapshot || snapshot.length === 0) {
      return
    }

    // If Y.Doc already has content, populate keyMap from it
    if (root.length > 0) {
      for (let i = 0; i < root.length; i++) {
        const child = root.get(i)
        if (child instanceof Y.XmlText) {
          const key = child.getAttribute('_key') as string | undefined
          if (key) {
            keyMap.set(key, child)
          }
        }
      }
      return
    }

    // Y.Doc is empty — populate from editor value
    yDoc.transact(() => {
      for (const block of snapshot) {
        const yBlock = blockToYText(block as Record<string, unknown>, keyMap)
        root.insert(root.length, [yBlock])
      }
    }, localOrigin)
  }

  function connect(): void {
    syncInitialState()

    // 1. Local mutations → Y.Doc
    const mutationSub = editor.on('mutation', (event) => {
      if (isApplyingRemote) {
        return
      }

      const localPatches = event.patches.filter((p) => p.origin === 'local')
      if (localPatches.length === 0) {
        return
      }

      yDoc.transact(() => {
        for (const patch of localPatches) {
          applyPatchToYDoc(patch, root, keyMap)
        }
      }, localOrigin)
    })

    // 2. Y.Doc changes → editor (granular PT patches)
    const handleYjsEvents = (
      events: Y.YEvent<Y.XmlText>[],
      transaction: Y.Transaction,
    ) => {
      if (transaction.origin === localOrigin) {
        return
      }

      const patches = ydocToPatches(events, keyMap)
      if (patches.length === 0) {
        return
      }

      const snapshot = rootToSnapshot(root) as
        | Array<PortableTextBlock>
        | undefined

      isApplyingRemote = true
      try {
        editor.send({
          type: 'patches',
          patches: patches.map((p) => ({
            ...p,
            origin: 'remote' as const,
          })) as Array<Patch>,
          snapshot,
        })
      } finally {
        isApplyingRemote = false
      }
    }

    root.observeDeep(handleYjsEvents)

    subscriptions = [
      () => mutationSub.unsubscribe(),
      () => root.unobserveDeep(handleYjsEvents),
    ]
  }

  function disconnect(): void {
    for (const unsub of subscriptions) {
      unsub()
    }
    subscriptions = []
  }

  return {
    connect,
    disconnect,
    yDoc,
    sharedRoot: root,
    keyMap,
  }
}

/**
 * Convert Y.Doc root to a PT snapshot.
 * Temporary fallback until granular ydocToPatches is implemented.
 */
function rootToSnapshot(
  root: Y.XmlFragment,
): Array<Record<string, unknown>> | undefined {
  const blocks: Array<Record<string, unknown>> = []

  for (let i = 0; i < root.length; i++) {
    const child = root.get(i)
    if (child instanceof Y.XmlText) {
      blocks.push(yBlockToObject(child))
    }
  }

  return blocks.length > 0 ? blocks : undefined
}

function yBlockToObject(yBlock: Y.XmlText): Record<string, unknown> {
  const block: Record<string, unknown> = {}

  const attrs = yBlock.getAttributes()
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'markDefs') {
      try {
        block[key] = JSON.parse(value as string)
      } catch {
        block[key] = []
      }
    } else {
      block[key] = value
    }
  }

  const blockDelta = yBlock.toDelta() as Array<{
    insert: string | Y.XmlText
    attributes?: Record<string, unknown>
  }>

  const children: Array<Record<string, unknown>> = []
  for (const entry of blockDelta) {
    if (typeof entry.insert === 'string') {
      const child: Record<string, unknown> = {text: entry.insert}
      if (entry.attributes) {
        for (const [key, value] of Object.entries(entry.attributes)) {
          if (key === 'marks') {
            try {
              child[key] = JSON.parse(value as string)
            } catch {
              child[key] = []
            }
          } else {
            child[key] = value
          }
        }
      }
      children.push(child)
    }
  }

  block['children'] = children.length > 0 ? children : [{text: ''}]

  if (!block['markDefs']) {
    block['markDefs'] = []
  }

  return block
}
