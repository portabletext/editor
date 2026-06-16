import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  createDropPositionBehaviorsConfig,
  type DropPosition,
} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../engine/interfaces/path'
import {pathEquals} from '../engine/path/path-equals'
import {EditorActorContext} from './editor-actor-context'
import {resolveElementDropPosition} from './resolve-element-drop-position'

type DropPositionStore = {
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => DropPosition | undefined
}

const defaultStore: DropPositionStore = {
  subscribe: () => () => {},
  getSnapshot: () => undefined,
}

const DropPositionStoreContext = createContext<DropPositionStore>(defaultStore)

/**
 * Holds the current drag drop position in a single store and registers the
 * core drop-position behavior. Consumers attach via {@link useElementDropPosition}
 * and re-render only when the position at their own path flips.
 *
 * Why not thread `dropPosition` through `renderElement`? It changes on every
 * `dragover` (pointer-move frequency), so feeding it to `renderElement`'s
 * `useCallback` deps hands Slate a new render function each tick and re-renders
 * the entire element tree. The per-path store re-renders only the blocks
 * gaining or losing the indicator. Mirrors `SelectionStateProvider`.
 */
export function DropPositionStateProvider({children}: {children: ReactNode}) {
  const editorActor = useContext(EditorActorContext)

  const [initialSubscribers] = useState(() => new Set<() => void>())
  const subscribersRef = useRef(initialSubscribers)
  const stateRef = useRef<DropPosition | undefined>(undefined)

  useEffect(() => {
    const behaviorConfigs = createDropPositionBehaviorsConfig({
      setDropPosition: (next) => {
        const prev = stateRef.current

        // The behavior fires this on every `dragover`, including moves that
        // stay within the same block. Notify only when the position actually
        // flips, so a pointer move that doesn't cross a boundary re-renders
        // nothing.
        if (
          prev === next ||
          (prev !== undefined &&
            next !== undefined &&
            prev.position === next.position &&
            pathEquals(prev.path, next.path))
        ) {
          return
        }

        stateRef.current = next
        for (const callback of subscribersRef.current) {
          callback()
        }
      },
    })

    for (const behaviorConfig of behaviorConfigs) {
      editorActor.send({type: 'add behavior', behaviorConfig})
    }

    return () => {
      for (const behaviorConfig of behaviorConfigs) {
        editorActor.send({type: 'remove behavior', behaviorConfig})
      }
    }
  }, [editorActor])

  const store = useMemo<DropPositionStore>(
    () => ({
      subscribe: (callback) => {
        subscribersRef.current.add(callback)
        return () => {
          subscribersRef.current.delete(callback)
        }
      },
      getSnapshot: () => stateRef.current,
    }),
    [],
  )

  return (
    <DropPositionStoreContext.Provider value={store}>
      {children}
    </DropPositionStoreContext.Provider>
  )
}

/**
 * Subscribe to the drop position at `path`: `'start'`, `'end'`, or `undefined`
 * when no drag is hovering this block. Re-renders only when this block's slice
 * flips, not when the position moves between other blocks.
 */
export function useElementDropPosition(
  path: Path,
): DropPosition['position'] | undefined {
  const store = useContext(DropPositionStoreContext)
  return useSyncExternalStore(store.subscribe, () =>
    resolveElementDropPosition(store.getSnapshot(), path),
  )
}
