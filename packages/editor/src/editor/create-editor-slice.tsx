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
import type {EditorSnapshot} from './editor-snapshot'
import {useEditor} from './use-editor'

/**
 * @alpha
 */
export type EditorSliceStore<TState> = {
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => TState
}

type SliceInstance<TState> = {
  store: EditorSliceStore<TState>
  recompute: (snapshot: EditorSnapshot) => void
  defaultState: TState
}

type SliceHostRegistry = {
  register: <TState>(
    sliceId: symbol,
    instance: SliceInstance<TState>,
  ) => () => void
  get: <TState>(sliceId: symbol) => SliceInstance<TState> | undefined
  subscribeToRegistry: (callback: () => void) => () => void
}

const SliceHostContext = createContext<SliceHostRegistry | null>(null)

/**
 * @alpha
 *
 * Hosts plugin-registered slices. Mounted by `EditorProvider`.
 */
export function EditorSliceHost(props: {children: ReactNode}) {
  const editor = useEditor()

  const [initialRegistry] = useState(
    () => new Map<symbol, SliceInstance<unknown>>(),
  )
  const registryRef = useRef(initialRegistry)
  const [initialRegistrySubs] = useState(() => new Set<() => void>())
  const registrySubsRef = useRef(initialRegistrySubs)

  useEffect(() => {
    let pendingRecompute = false

    const subscription = editor.subscribe({
      next: () => {
        if (pendingRecompute) {
          return
        }
        pendingRecompute = true
        queueMicrotask(() => {
          pendingRecompute = false
          const snapshot = editor.getSnapshot()
          for (const instance of registryRef.current.values()) {
            instance.recompute(snapshot)
          }
        })
      },
    })

    return () => subscription.unsubscribe()
  }, [editor])

  const registry = useMemo<SliceHostRegistry>(
    () => ({
      register: (sliceId, instance) => {
        registryRef.current.set(sliceId, instance as SliceInstance<unknown>)
        for (const cb of registrySubsRef.current) {
          cb()
        }
        return () => {
          registryRef.current.delete(sliceId)
          for (const cb of registrySubsRef.current) {
            cb()
          }
        }
      },
      get: (sliceId) =>
        registryRef.current.get(sliceId) as SliceInstance<never> | undefined,
      subscribeToRegistry: (callback) => {
        registrySubsRef.current.add(callback)
        return () => {
          registrySubsRef.current.delete(callback)
        }
      },
    }),
    [],
  )

  return (
    <SliceHostContext.Provider value={registry}>
      {props.children}
    </SliceHostContext.Provider>
  )
}

/**
 * @alpha
 *
 * Factory for plugin-author-defined slices of engine-derived state.
 * The returned `Plugin` mounts the slice with the editor's slice host;
 * the returned `useSlice` hook reads from anywhere inside the editor
 * and only re-renders when the selected value flips.
 *
 * @example
 * ```tsx
 * const listIndexSlice = createEditorSlice<Map<string, number>>({
 *   defaultState: new Map(),
 *   compute: (snapshot) => buildListIndexMap(snapshot.context),
 *   equal: shallowMapEqual,
 *   displayName: 'ListIndexSlice',
 * })
 *
 * export function ListIndexPlugin() {
 *   return <listIndexSlice.Plugin />
 * }
 *
 * export function useListIndex(path: Path): number | undefined {
 *   return listIndexSlice.useSlice((map) => map.get(path[0]._key))
 * }
 * ```
 */
export function createEditorSlice<TState>(options: {
  defaultState: TState
  compute: (snapshot: EditorSnapshot) => TState
  equal: (a: TState, b: TState) => boolean
  displayName?: string
}) {
  const {defaultState, compute, equal} = options
  const displayName = options.displayName ?? 'EditorSlice'

  const sliceId = Symbol(displayName)

  function Plugin() {
    const registry = useContext(SliceHostContext)
    if (!registry) {
      throw new Error(
        `${displayName}.Plugin must be mounted inside <EditorProvider>.`,
      )
    }
    const editor = useEditor()

    const [seed] = useState(() => compute(editor.getSnapshot()))
    const stateRef = useRef<TState>(seed)
    const [initialSubscribers] = useState(() => new Set<() => void>())
    const subscribersRef = useRef<Set<() => void>>(initialSubscribers)

    const store = useMemo<EditorSliceStore<TState>>(
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

    useEffect(() => {
      // Reconcile state between render-time seed and effect-time
      // (snapshot may have advanced after child effects).
      const next = compute(editor.getSnapshot())
      if (!equal(stateRef.current, next)) {
        stateRef.current = next
        for (const cb of subscribersRef.current) {
          cb()
        }
      }

      const unregister = registry.register(sliceId, {
        store,
        defaultState,
        recompute: (snapshot) => {
          const newState = compute(snapshot)
          if (!equal(stateRef.current, newState)) {
            stateRef.current = newState
            for (const cb of subscribersRef.current) {
              cb()
            }
          }
        },
      })

      return unregister
    }, [editor, registry, store])

    return null
  }
  Plugin.displayName = `${displayName}.Plugin`

  function useSlice<TSelected>(
    selector: (state: TState) => TSelected,
    selectorEqual: (a: TSelected, b: TSelected) => boolean = Object.is,
  ): TSelected {
    const registry = useContext(SliceHostContext)

    // Re-read the registered instance whenever Plugin mounts/unmounts.
    const registryVersion = useSyncExternalStore(
      registry ? registry.subscribeToRegistry : noopSubscribe,
      () => (registry ? registry.get(sliceId) : undefined),
    )

    const instance = registryVersion as SliceInstance<TState> | undefined

    const lastSelected = useRef<{value: TSelected; hasValue: boolean}>({
      value: undefined as TSelected,
      hasValue: false,
    })

    return useSyncExternalStore(
      instance ? instance.store.subscribe : noopSubscribe,
      () => {
        const state = instance ? instance.store.getSnapshot() : defaultState
        const next = selector(state)
        if (
          lastSelected.current.hasValue &&
          selectorEqual(lastSelected.current.value, next)
        ) {
          return lastSelected.current.value
        }
        lastSelected.current = {value: next, hasValue: true}
        return next
      },
    )
  }

  return {Plugin, useSlice}
}

const noopSubscribe = (() => () => {}) satisfies (cb: () => void) => () => void
