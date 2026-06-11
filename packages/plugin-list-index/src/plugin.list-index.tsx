import {useEditor, type Editor, type Path} from '@portabletext/editor'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {buildListIndexMap, serializePath} from './build-list-index-map'

/**
 * One store per editor: a single `operation` subscription maintains the
 * list index map, and per-path subscriber buckets make notification
 * O(changed paths) rather than O(subscribers).
 */
type ListIndexStore = {
  get: (serializedPath: string) => number | undefined
  subscribeKey: (serializedPath: string, callback: () => void) => () => void
  /**
   * Starts the `operation` subscription. Returns the unsubscribe.
   */
  subscribe: () => () => void
}

function createListIndexStore(editor: Editor): ListIndexStore {
  let listIndexMap = buildListIndexMap(editor.getSnapshot().context)
  const subscribers = new Map<string, Set<() => void>>()
  let rebuildScheduled = false
  let subscribed = false

  function scheduleRebuild() {
    if (rebuildScheduled) {
      return
    }

    rebuildScheduled = true

    // Coalesce per microtask: bulk transactions (value sync, multi-block
    // inserts) deliver one operation per affected block, and rebuilding per
    // operation would be O(blocks^2). The map has only React consumers and
    // they read post-commit, so deferring to the end of the JS turn is
    // safe; the microtask drains before React's commit.
    queueMicrotask(() => {
      rebuildScheduled = false

      if (subscribed) {
        rebuild()
      }
    })
  }

  function rebuild() {
    const previousListIndexMap = listIndexMap

    // Swap before notifying: `useSyncExternalStore` re-reads the snapshot
    // synchronously on notification and skips the re-render when it reads
    // an unchanged (stale) value.
    listIndexMap = buildListIndexMap(editor.getSnapshot().context)

    for (const [serializedPath, callbacks] of subscribers) {
      if (
        previousListIndexMap.get(serializedPath) !==
        listIndexMap.get(serializedPath)
      ) {
        for (const callback of callbacks) {
          callback()
        }
      }
    }
  }

  return {
    get: (serializedPath) => listIndexMap.get(serializedPath),
    subscribeKey: (serializedPath, callback) => {
      let bucket = subscribers.get(serializedPath)

      if (bucket === undefined) {
        bucket = new Set()
        subscribers.set(serializedPath, bucket)
      }

      bucket.add(callback)

      return () => {
        bucket.delete(callback)

        if (bucket.size === 0) {
          subscribers.delete(serializedPath)
        }
      }
    },
    subscribe: () => {
      subscribed = true

      // Operations applied between store creation (render) and subscription
      // (effect) are not observed, so reconcile once up front.
      rebuild()

      const subscription = editor.on('operation', (event) => {
        if (
          event.operation.type === 'insert.text' ||
          event.operation.type === 'remove.text'
        ) {
          // Inserting and removing text has no effect on list indices so
          // there is no need to rebuild those.
          return
        }

        if (event.operation.path.length > 2) {
          // Operations deep inside blocks only modify nested structure and
          // cannot affect root-level list indices.
          return
        }

        scheduleRebuild()
      })

      return () => {
        subscribed = false
        subscription.unsubscribe()
      }
    },
  }
}

const ListIndexContext = createContext<ListIndexStore | undefined>(undefined)

/**
 * Maintains a list index map for the editor and serves it through context.
 * Mount inside `EditorProvider`, wrapping whatever reads the indices:
 *
 * ```tsx
 * <EditorProvider initialConfig={...}>
 *   <ListIndexProvider>
 *     <PortableTextEditable />
 *   </ListIndexProvider>
 * </EditorProvider>
 * ```
 *
 * The map is rebuilt at most once per editor operation, regardless of how
 * many components read it, and only for operations that can affect list
 * indices. Reads via {@link useListIndex} only re-render when the index at
 * their own path changes.
 *
 * @beta
 */
export function ListIndexProvider(props: {children?: ReactNode}) {
  const editor = useEditor()
  const store = useMemo(() => createListIndexStore(editor), [editor])

  useEffect(() => {
    return store.subscribe()
  }, [store])

  return (
    <ListIndexContext.Provider value={store}>
      {props.children}
    </ListIndexContext.Provider>
  )
}

/**
 * Read the 1-based list index of the block at `path`, or `undefined` when
 * the block is not a list item. Re-renders only when the index at this
 * path changes.
 *
 * `path` is the keyed block path render callbacks receive, e.g.
 * `[{_key: 'b0'}]`.
 *
 * @beta
 */
export function useListIndex(path: Path): number | undefined {
  const store = useContext(ListIndexContext)

  if (store === undefined) {
    throw new Error('useListIndex must be used below a <ListIndexProvider>')
  }

  // Callers typically pass a fresh `path` array every render, so the
  // serialized string, not the array, is what keeps `subscribe` stable
  // below. Memoizing on the array would never hit.
  const serializedPath = serializePath(path)

  const subscribe = useCallback(
    (callback: () => void) => store.subscribeKey(serializedPath, callback),
    [store, serializedPath],
  )

  const getSnapshot = () => store.get(serializedPath)

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
