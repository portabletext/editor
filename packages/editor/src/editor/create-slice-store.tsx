import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {AnyActorRef} from 'xstate'

export type SliceStore<TState> = {
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => TState
}

/**
 * Factor of the `SelectionStateProvider` shape: one subscription to an
 * actor, one state struct recomputed per change (microtask-coalesced),
 * exposed via a `useSyncExternalStore`-compatible store + React context
 * so consumers attach per-slice and re-render only when their slice
 * flips.
 */
export function createSliceStore<TState>(options: {
  defaultState: TState
  equal: (a: TState, b: TState) => boolean
  displayName: string
}): {
  Provider: (props: {
    actor: AnyActorRef
    /**
     * Memoize this with `useMemo` / `useCallback` — a new `compute`
     * reference tears down and re-subscribes the actor effect.
     */
    compute: () => TState
    children: ReactNode
  }) => ReactNode
  useStore: () => SliceStore<TState>
} {
  const {defaultState, equal, displayName} = options

  // No-op store for slice hooks called outside a Provider.
  const defaultStore: SliceStore<TState> = {
    subscribe: () => () => {},
    getSnapshot: () => defaultState,
  }

  const StoreContext = createContext<SliceStore<TState>>(defaultStore)
  StoreContext.displayName = displayName

  function Provider(props: {
    actor: AnyActorRef
    compute: () => TState
    children: ReactNode
  }) {
    const {actor, compute} = props

    const [seed] = useState(compute)
    const stateRef = useRef<TState>(seed)

    const [initialSubscribers] = useState(() => new Set<() => void>())
    const subscribersRef = useRef<Set<() => void>>(initialSubscribers)

    useEffect(() => {
      // Catches state changes between the first render (when `seed` was
      // captured) and this effect firing after commit. Child effects
      // run before parent effects, so subscribers are already attached.
      const next = compute()
      if (!equal(stateRef.current, next)) {
        stateRef.current = next
        for (const cb of subscribersRef.current) {
          cb()
        }
      }

      let pendingRecompute = false

      const subscription = actor.subscribe(() => {
        // Coalesce bursts of actor updates into one recompute per
        // microtask. The microtask drains before React's commit phase.
        if (pendingRecompute) {
          return
        }
        pendingRecompute = true
        queueMicrotask(() => {
          pendingRecompute = false
          const newState = compute()
          if (!equal(stateRef.current, newState)) {
            stateRef.current = newState
            for (const cb of subscribersRef.current) {
              cb()
            }
          }
        })
      })

      return () => subscription.unsubscribe()
    }, [actor, compute])

    const store = useMemo<SliceStore<TState>>(
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
      <StoreContext.Provider value={store}>
        {props.children}
      </StoreContext.Provider>
    )
  }
  Provider.displayName = `${displayName}.Provider`

  function useStore(): SliceStore<TState> {
    return useContext(StoreContext)
  }

  return {Provider, useStore}
}
