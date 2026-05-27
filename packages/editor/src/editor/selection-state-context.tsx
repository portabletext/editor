import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {useEngineStatic} from '../engine/react/hooks/use-engine-static'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'
import {getSelectionState, type SelectionState} from './get-selection-state'

const emptySet = new Set<string>()

const defaultSelectionState: SelectionState = {
  focusedLeafPath: undefined,
  selectedLeafPaths: emptySet,
  focusedContainerPath: undefined,
  selectedContainerPaths: emptySet,
}

/**
 * Returns `true` when the two states are equal by content; `false` when
 * any slice differs. Used to short-circuit notifications when a state
 * change doesn't move any per-component slice.
 *
 * Assumes the Set instances passed via `selectedLeafPaths` /
 * `selectedContainerPaths` are immutable per emission - `getSelectionState`
 * builds a fresh Set on each recompute rather than mutating in place,
 * so size + containment equivalence is a sound equality check.
 */
function selectionStatesEqual(
  prev: SelectionState,
  next: SelectionState,
): boolean {
  if (prev.focusedLeafPath !== next.focusedLeafPath) {
    return false
  }
  if (prev.focusedContainerPath !== next.focusedContainerPath) {
    return false
  }
  if (prev.selectedLeafPaths !== next.selectedLeafPaths) {
    if (prev.selectedLeafPaths.size !== next.selectedLeafPaths.size) {
      return false
    }
    for (const path of prev.selectedLeafPaths) {
      if (!next.selectedLeafPaths.has(path)) {
        return false
      }
    }
  }
  if (prev.selectedContainerPaths !== next.selectedContainerPaths) {
    if (prev.selectedContainerPaths.size !== next.selectedContainerPaths.size) {
      return false
    }
    for (const path of prev.selectedContainerPaths) {
      if (!next.selectedContainerPaths.has(path)) {
        return false
      }
    }
  }
  return true
}

/**
 * External store shape exposed to consumers. Components subscribe via
 * `useSyncExternalStore` with a per-slice snapshot selector so they
 * only re-render when their own slice flips - typing a character
 * doesn't cascade through every visible container's wrapper.
 */
type SelectionStateStore = {
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => SelectionState
}

const defaultStore: SelectionStateStore = {
  subscribe: () => () => {},
  getSnapshot: () => defaultSelectionState,
}

const SelectionStateStoreContext =
  createContext<SelectionStateStore>(defaultStore)

/**
 * Subscribes once to the editor actor and maintains a single source of
 * truth for selection state. Consumers attach via per-slice hooks
 * (`useIsFocusedContainer` et al.) and re-render only when their slice
 * flips.
 *
 * Why not `useSelector` + `Context.Provider value={selectionState}`?
 * That broadcasts the entire `SelectionState` object on every change,
 * forcing every component reading the context to re-render even when
 * their per-component focused/selected status didn't flip. O(N)
 * unnecessary re-renders per keystroke where N is visible containers.
 */
export function SelectionStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const editorActor = useContext(EditorActorContext)
  const editorEngine = useEngineStatic()

  // Compute the current snapshot once on every read. Cheap when nothing
  // has changed (refs are reference-equal); recomputes on actor updates
  // (handled in the subscription effect below).
  const computeCurrent = useMemo(
    () => () => {
      const actorSnapshot = editorActor.getSnapshot()
      const snapshot = getEditorSnapshot({
        editorActorSnapshot: actorSnapshot,
        editorEngineInstance: editorEngine,
      })
      const selection = snapshot.context.selection
        ? {
            anchorPath: snapshot.context.selection.anchor.path,
            focusPath: snapshot.context.selection.focus.path,
            backward: snapshot.context.selection.backward ?? false,
            isCollapsed: isSelectionCollapsed(snapshot),
          }
        : null

      return getSelectionState(
        {
          context: {
            schema: snapshot.context.schema,
            containers: editorEngine.publicContainers,
            value: snapshot.context.value,
          },
          blockIndexMap: editorEngine.blockIndexMap,
        },
        selection,
      )
    },
    [editorActor, editorEngine],
  )

  // Seed the initial snapshot exactly once via `useState`'s lazy
  // initializer, then keep it on a ref the external store reads from.
  // `useRef(seed)` writes `seed` to the ref on first render only;
  // subsequent renders ignore the argument. The subscription effect
  // below takes ownership of updates after mount.
  const [seed] = useState(computeCurrent)
  const stateRef = useRef<SelectionState>(seed)

  // Same pattern for the subscriber Set: lazy-init via `useState` so we
  // allocate the empty Set exactly once, not on every render.
  const [initialSubscribers] = useState(() => new Set<() => void>())
  const subscribersRef = useRef<Set<() => void>>(initialSubscribers)

  useEffect(() => {
    // Mount ordering: child effects run before parent effects, so by
    // the time this effect runs every consumer `useSyncExternalStore`
    // has already registered its notify callback in
    // `subscribersRef.current`. The recompute-and-notify below catches
    // any state changes between the provider's first render (when we
    // seeded `stateRef`) and this effect firing (after commit).
    const next = computeCurrent()
    if (!selectionStatesEqual(stateRef.current, next)) {
      stateRef.current = next
      for (const cb of subscribersRef.current) {
        cb()
      }
    }

    let pendingRecompute = false

    const subscription = editorActor.subscribe(() => {
      // Coalesce bursts of actor updates into one selection-state
      // recompute per microtask. The microtask drains before React's
      // commit phase, so subscribers re-render in the same commit as
      // the actor's state change.
      if (pendingRecompute) {
        return
      }
      pendingRecompute = true
      queueMicrotask(() => {
        pendingRecompute = false
        const newState = computeCurrent()
        if (!selectionStatesEqual(stateRef.current, newState)) {
          stateRef.current = newState
          for (const cb of subscribersRef.current) {
            cb()
          }
        }
      })
    })

    return () => subscription.unsubscribe()
  }, [editorActor, computeCurrent])

  const store = useMemo<SelectionStateStore>(
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
    <SelectionStateStoreContext.Provider value={store}>
      {children}
    </SelectionStateStoreContext.Provider>
  )
}

/**
 * Subscribe to whether a container at `serializedPath` is currently
 * focused. Re-renders only when this boolean flips - not when other
 * containers' focused state changes.
 */
export function useIsFocusedContainer(serializedPath: string): boolean {
  const store = useContext(SelectionStateStoreContext)
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().focusedContainerPath === serializedPath,
  )
}

/**
 * Subscribe to whether a container at `serializedPath` is within the
 * current selection.
 */
export function useIsSelectedContainer(serializedPath: string): boolean {
  const store = useContext(SelectionStateStoreContext)
  return useSyncExternalStore(store.subscribe, () =>
    store.getSnapshot().selectedContainerPaths.has(serializedPath),
  )
}

/**
 * Subscribe to whether a leaf (span / inline object / block object) at
 * `serializedPath` is currently focused.
 */
export function useIsFocusedLeaf(serializedPath: string): boolean {
  const store = useContext(SelectionStateStoreContext)
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().focusedLeafPath === serializedPath,
  )
}

/**
 * Subscribe to whether a leaf at `serializedPath` is within the current
 * selection.
 */
export function useIsSelectedLeaf(serializedPath: string): boolean {
  const store = useContext(SelectionStateStoreContext)
  return useSyncExternalStore(store.subscribe, () =>
    store.getSnapshot().selectedLeafPaths.has(serializedPath),
  )
}
