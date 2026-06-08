import {useContext, useMemo, useSyncExternalStore} from 'react'
import type {Path} from '../engine/interfaces/path'
import {useEngineStatic} from '../engine/react/hooks/use-engine-static'
import {serializePath} from '../paths/serialize-path'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {createSliceStore} from './create-slice-store'
import {EditorActorContext} from './editor-actor-context'
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
 * `selectedContainerPaths` are immutable per emission — `getSelectionState`
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

const {Provider: StoreProvider, useStore} = createSliceStore<SelectionState>({
  defaultState: defaultSelectionState,
  equal: selectionStatesEqual,
  displayName: 'SelectionStateStore',
})

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

  // Memoized on engine identity so the actor subscription doesn't
  // tear down on every Provider re-render.
  const compute = useMemo(
    () => () => {
      const snapshot = editorEngine.snapshot
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
            containers: editorEngine.snapshot.context.containers,
            value: snapshot.context.value,
          },
          blockIndexMap: editorEngine.blockIndexMap,
        },
        selection,
      )
    },
    [editorEngine],
  )

  return (
    <StoreProvider actor={editorActor} compute={compute}>
      {children}
    </StoreProvider>
  )
}

/**
 * @alpha
 *
 * Subscribe to whether the container at `path` is currently the
 * innermost container that contains the caret. Re-renders only when
 * this boolean flips — not when other containers' focused state
 * changes, and not on every keystroke when the boolean doesn't move.
 */
export function useIsFocusedContainer(path: Path): boolean {
  const store = useStore()
  const serializedPath = serializePath(path)
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().focusedContainerPath === serializedPath,
  )
}

/**
 * @alpha
 *
 * Subscribe to whether the container at `path` is within (or contains)
 * the current selection.
 */
export function useIsSelectedContainer(path: Path): boolean {
  const store = useStore()
  const serializedPath = serializePath(path)
  return useSyncExternalStore(store.subscribe, () =>
    store.getSnapshot().selectedContainerPaths.has(serializedPath),
  )
}

/**
 * @alpha
 *
 * Subscribe to whether the leaf (span, inline object, or block object)
 * at `path` is the one the caret is in or on.
 */
export function useIsFocusedLeaf(path: Path): boolean {
  const store = useStore()
  const serializedPath = serializePath(path)
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().focusedLeafPath === serializedPath,
  )
}

/**
 * @alpha
 *
 * Subscribe to whether the leaf at `path` is within the current
 * selection.
 */
export function useIsSelectedLeaf(path: Path): boolean {
  const store = useStore()
  const serializedPath = serializePath(path)
  return useSyncExternalStore(store.subscribe, () =>
    store.getSnapshot().selectedLeafPaths.has(serializedPath),
  )
}
