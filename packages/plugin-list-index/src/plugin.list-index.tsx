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
      // Operations applied between store creation (render) and subscription
      // (effect) are not observed, so reconcile once up front.
      rebuild()

      // Buffered microtask delivery coalesces a burst (e.g. one operation per
      // block during a large delete, insert, or undo) into a single call
      // carrying the whole burst, so the map rebuilds at most once per burst
      // instead of once per operation. Text ops never change list structure;
      // every other document-changing op can (including deep edits inside a
      // container), so rebuild only when the burst contains one. Inspecting
      // the whole burst is why this needs `buffer`: deliver-last would drop a
      // structural op whenever a text op happened to be last in the burst.
      const subscription = editor.on(
        'operation',
        (events) => {
          if (
            events.some(
              (event) =>
                event.operation.type !== 'insert.text' &&
                event.operation.type !== 'remove.text',
            )
          ) {
            rebuild()
          }
        },
        {schedule: 'microtask', buffer: true},
      )

      return () => {
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
 * The map is rebuilt at most once per microtask burst of operations,
 * regardless of how many operations the burst contains or how many
 * components read it, and only when the burst contains an operation that can
 * affect list indices. Reads via {@link useListIndex} only re-render when the
 * index at their own path changes.
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
