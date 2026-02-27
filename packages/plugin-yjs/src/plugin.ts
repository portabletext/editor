import * as Y from 'yjs'
import {applyPatchToYDoc} from './patch-to-ydoc'
import type {YjsPluginConfig, YjsPluginInstance} from './types'
import {yEventsToPatches} from './ydoc-to-patch'

/**
 * @public
 */
export function createYjsPlugin(config: YjsPluginConfig): YjsPluginInstance {
  const {editor, yDoc, localOrigin = 'local'} = config
  const blocksMap = yDoc.getMap('blocks')
  const orderArray = yDoc.getArray<string>('order')

  let isApplyingRemote = false
  let subscriptions: Array<() => void> = []

  function connect() {
    // 1. Subscribe to local mutations → push to Y.Doc
    const mutationSub = editor.on('mutation', (event) => {
      if (isApplyingRemote) {
        return
      }

      const localPatches = event.patches.filter((p) => p.origin === 'local')
      if (localPatches.length === 0) {
        return
      }

      yDoc.transact(() => {
        // Ensure all blocks referenced by patches exist in Y.Doc.
        // Use the mutation snapshot to lazily populate missing blocks.
        if (event.value) {
          ensureBlocksExist(event.value, blocksMap, orderArray)
        }

        for (const patch of localPatches) {
          applyPatchToYDoc(patch, blocksMap, orderArray)
        }
      }, localOrigin)
    })

    // 2. Observe Y.Doc changes → inject as remote patches
    const handleYjsUpdate = (
      events: Y.YEvent<any>[],
      transaction: Y.Transaction,
    ) => {
      if (transaction.origin === localOrigin) {
        return
      }

      const patches = yEventsToPatches(events, blocksMap, orderArray)
      if (patches.length === 0) {
        return
      }

      isApplyingRemote = true
      try {
        editor.send({
          type: 'patches',
          patches: patches.map((p) => ({...p, origin: 'remote' as const})),
          snapshot: getCurrentSnapshot(blocksMap, orderArray),
        })
      } finally {
        isApplyingRemote = false
      }
    }

    blocksMap.observeDeep(handleYjsUpdate)

    subscriptions = [
      () => mutationSub.unsubscribe(),
      () => blocksMap.unobserveDeep(handleYjsUpdate),
    ]
  }

  function disconnect() {
    for (const unsub of subscriptions) {
      unsub()
    }
    subscriptions = []
  }

  // Initialize: sync current editor value to Y.Doc if Y.Doc is empty
  function syncInitialState(value: Array<any> | undefined) {
    if (!value || value.length === 0) {
      return
    }
    if (orderArray.length > 0) {
      return // Y.Doc already has content
    }

    yDoc.transact(() => {
      for (const block of value) {
        addBlockToYDoc(block, blocksMap, orderArray)
      }
    }, localOrigin)
  }

  return {
    connect,
    disconnect,
    syncInitialState,
    yDoc,
    blocksMap,
    orderArray,
  }
}

/**
 * Ensure all blocks from the snapshot exist in the Y.Doc.
 * Adds any missing blocks without touching existing ones.
 * This handles the case where Yjs mode is toggled on after
 * content already exists in the editor.
 */
function ensureBlocksExist(
  value: Array<any>,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): void {
  for (const block of value) {
    const blockKey = block['_key'] as string | undefined
    if (!blockKey) {
      continue
    }

    // Skip blocks that already exist in Y.Doc
    if (blocksMap.has(blockKey)) {
      continue
    }

    addBlockToYDoc(block, blocksMap, orderArray)
  }
}

/**
 * Add a single PT block to the Y.Doc, creating the appropriate
 * Y.Map/Y.Array/Y.Text structure.
 */
function addBlockToYDoc(
  block: Record<string, unknown>,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): void {
  const blockKey = block['_key'] as string | undefined
  if (!blockKey) {
    return
  }

  const blockMap = new Y.Map()
  for (const [key, val] of Object.entries(block)) {
    if (key === 'children' && Array.isArray(val)) {
      const childrenArray = new Y.Array()
      for (const child of val) {
        const childMap = new Y.Map()
        for (const [ck, cv] of Object.entries(
          child as Record<string, unknown>,
        )) {
          if (ck === 'text' && typeof cv === 'string') {
            childMap.set(ck, new Y.Text(cv))
          } else {
            childMap.set(ck, cv)
          }
        }
        childrenArray.push([childMap])
      }
      blockMap.set(key, childrenArray)
    } else if (key === 'markDefs' && Array.isArray(val)) {
      const markDefsArray = new Y.Array()
      for (const markDef of val) {
        const markDefMap = new Y.Map()
        for (const [mk, mv] of Object.entries(
          markDef as Record<string, unknown>,
        )) {
          markDefMap.set(mk, mv)
        }
        markDefsArray.push([markDefMap])
      }
      blockMap.set(key, markDefsArray)
    } else {
      blockMap.set(key, val)
    }
  }
  blocksMap.set(blockKey, blockMap)
  orderArray.push([blockKey])
}

function getCurrentSnapshot(
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): Array<any> | undefined {
  const blocks: Array<any> = []
  for (let i = 0; i < orderArray.length; i++) {
    const key = orderArray.get(i)
    const blockMap = blocksMap.get(key)
    if (blockMap instanceof Y.Map) {
      blocks.push(yMapToObject(blockMap))
    }
  }
  return blocks.length > 0 ? blocks : undefined
}

function yMapToObject(yMap: Y.Map<any>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of yMap.entries()) {
    if (value instanceof Y.Text) {
      obj[key] = value.toString()
    } else if (value instanceof Y.Map) {
      obj[key] = yMapToObject(value)
    } else if (value instanceof Y.Array) {
      obj[key] = yArrayToArray(value)
    } else {
      obj[key] = value
    }
  }
  return obj
}

function yArrayToArray(yArray: Y.Array<any>): Array<unknown> {
  const arr: Array<unknown> = []
  for (let i = 0; i < yArray.length; i++) {
    const item = yArray.get(i)
    if (item instanceof Y.Map) {
      arr.push(yMapToObject(item))
    } else if (item instanceof Y.Array) {
      arr.push(yArrayToArray(item))
    } else {
      arr.push(item)
    }
  }
  return arr
}
