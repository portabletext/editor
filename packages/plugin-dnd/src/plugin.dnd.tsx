import type {Path} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  type Behavior,
} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {
  getFocusBlock,
  getSelectedBlocks,
  isSelectingEntireBlocks,
} from '@portabletext/editor/selectors'
import {isKeyedSegment} from '@portabletext/editor/utils'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {getDragSelection} from './drag-selection'

/**
 * The block-relative position a drop would land at.
 *
 * @beta
 */
export type DropPosition = {
  path: Path
  position: 'start' | 'end'
}

/**
 * One store per editor: the drag behaviors below maintain the current drop
 * position, and per-path subscriber buckets make notification O(changed
 * paths) rather than O(subscribers). `dragover` fires at mousemove
 * frequency, so only the block losing and the block gaining the indicator
 * re-render.
 */
type DropPositionStore = {
  get: (serializedPath: string) => DropPosition['position'] | undefined
  subscribeKey: (serializedPath: string, callback: () => void) => () => void
  set: (next: DropPosition | undefined) => void
}

function createDropPositionStore(): DropPositionStore {
  let current:
    | {serializedPath: string; position: DropPosition['position']}
    | undefined
  const subscribers = new Map<string, Set<() => void>>()

  function notify(serializedPath: string | undefined) {
    if (serializedPath === undefined) {
      return
    }

    const bucket = subscribers.get(serializedPath)

    if (bucket === undefined) {
      return
    }

    for (const callback of bucket) {
      callback()
    }
  }

  return {
    get: (serializedPath) =>
      current?.serializedPath === serializedPath ? current.position : undefined,
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
    set: (next) => {
      const previous = current

      // Swap before notifying: `useSyncExternalStore` re-reads the snapshot
      // synchronously on notification and skips the re-render when it reads
      // an unchanged (stale) value.
      current = next
        ? {serializedPath: serializePath(next.path), position: next.position}
        : undefined

      if (
        previous?.serializedPath === current?.serializedPath &&
        previous?.position === current?.position
      ) {
        return
      }

      if (previous?.serializedPath !== current?.serializedPath) {
        notify(previous?.serializedPath)
      }

      notify(current?.serializedPath)
    },
  }
}

/**
 * The behaviors observe the public `drag.*` events and `forward` every
 * event they handle: consumer behaviors run before the editor's own drag
 * handling, so omitting the forward would swallow the event and break the
 * drag itself. (The editor's internal drop-position tracking gets away
 * without forwarding because it registers below core priority.)
 */
function createDropPositionBehaviors(
  setDropPosition: (next: DropPosition | undefined) => void,
): Array<Behavior> {
  return [
    defineBehavior({
      on: 'drag.dragover',
      guard: ({snapshot, event}) => {
        const dropFocusBlock = getFocusBlock({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: event.position.selection,
          },
        })

        if (!dropFocusBlock) {
          return false
        }

        const dragOrigin = event.dragOrigin

        if (!dragOrigin) {
          return false
        }

        const dragSelection = getDragSelection({
          eventSelection: dragOrigin.selection,
          snapshot,
        })

        const draggedBlocks = getSelectedBlocks({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragSelection,
          },
        })

        if (
          draggedBlocks.some(
            (draggedBlock) =>
              draggedBlock.node._key === dropFocusBlock.node._key,
          )
        ) {
          return false
        }

        const draggingEntireBlocks = isSelectingEntireBlocks({
          ...snapshot,
          context: {
            ...snapshot.context,
            selection: dragSelection,
          },
        })

        if (!draggingEntireBlocks) {
          return false
        }

        return {dropFocusBlock}
      },
      actions: [
        ({event}, {dropFocusBlock}) => [
          effect(() => {
            setDropPosition({
              path: dropFocusBlock.path,
              position: event.position.block,
            })
          }),
          forward(event),
        ],
      ],
    }),
    defineBehavior({
      on: 'drag.*',
      guard: ({event}) => event.type !== 'drag.dragover',
      actions: [
        ({event}) => [
          effect(() => {
            setDropPosition(undefined)
          }),
          forward(event),
        ],
      ],
    }),
  ]
}

const DndContext = createContext<DropPositionStore | undefined>(undefined)

/**
 * Tracks the drop position during drag and drop and serves it through
 * context. Mount inside `EditorProvider`, wrapping whatever reads the
 * position:
 *
 * ```tsx
 * <EditorProvider initialConfig={...}>
 *   <DndProvider>
 *     <PortableTextEditable />
 *   </DndProvider>
 * </EditorProvider>
 * ```
 *
 * Reads via {@link useDropPosition} only re-render when the drop position
 * at their own path changes.
 *
 * @beta
 */
export function DndProvider(props: {children?: ReactNode}) {
  const store = useMemo(() => createDropPositionStore(), [])
  const behaviors = useMemo(
    () => createDropPositionBehaviors(store.set),
    [store],
  )

  useEffect(() => {
    return () => {
      // A drag in progress when the provider unmounts never delivers its
      // clearing event.
      store.set(undefined)
    }
  }, [store])

  return (
    <DndContext.Provider value={store}>
      <BehaviorPlugin behaviors={behaviors} />
      {props.children}
    </DndContext.Provider>
  )
}

/**
 * Read where a drop would land relative to the block at `path`: `'start'`,
 * `'end'`, or `undefined` when no drag is hovering this block. Re-renders
 * only when the position at this path changes.
 *
 * `path` is the keyed block path render callbacks receive, e.g.
 * `[{_key: 'b0'}]`.
 *
 * @beta
 */
export function useDropPosition(
  path: Path,
): DropPosition['position'] | undefined {
  const store = useContext(DndContext)

  if (store === undefined) {
    throw new Error('useDropPosition must be used below a <DndProvider>')
  }

  // Callers typically pass a fresh `path` array every render, so the
  // serialized string, not the array, is what keeps `subscribe` stable
  // below.
  const serializedPath = serializePath(path)

  const subscribe = useCallback(
    (callback: () => void) => store.subscribeKey(serializedPath, callback),
    [store, serializedPath],
  )

  const getSnapshot = () => store.get(serializedPath)

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Serialize a keyed path to a string using Sanity's bracket notation.
 * Duplicated from the editor's internal `serializePath`; see
 * `drag-selection.ts` for the duplication rationale.
 */
function serializePath(path: Path): string {
  return path.reduce<string>((result, segment, index) => {
    if (isKeyedSegment(segment)) {
      return `${result}[_key=="${segment._key}"]`
    }

    const separator = index === 0 ? '' : '.'
    return `${result}${separator}${segment}`
  }, '')
}
