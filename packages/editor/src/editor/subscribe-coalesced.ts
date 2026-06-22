type Unsubscribable = {unsubscribe: () => void}

interface SubscribableActor {
  subscribe(observer: {
    next?: (value: unknown) => void
    error?: (error: unknown) => void
    complete?: () => void
  }): Unsubscribable
}

/**
 * Subscribe to an actor, coalescing a synchronous burst of emissions into a
 * single trailing-microtask `next` call.
 *
 * The editor's actor emits once per applied operation, so a single action
 * (undoing a large delete, inserting many blocks) emits O(operations) times.
 * Subscribers that recompute derived state from the settled snapshot, the
 * public `editor.subscribe`, selection-state, want one notification per burst,
 * not one per operation; reacting per operation makes a selection-scanning
 * recompute O(operations × selection) and freezes the main thread.
 *
 * Coalescing here, at the snapshot subscription, is the single place that
 * concern lives: the snapshot is cumulative, so delivering only the settled
 * state once per burst is sound, and it lands on the same microtask boundary
 * the editor's render already coalesces to. Consumers that need every
 * operation (patch generation, the mutation batcher) subscribe to the raw
 * actor or the `operation` event stream instead.
 *
 * `error`/`complete` are forwarded untouched; only `next` is coalesced.
 */
export function subscribeCoalesced(
  actor: SubscribableActor,
  observer: {
    next?: () => void
    error?: (error: unknown) => void
    complete?: () => void
  },
): Unsubscribable {
  let scheduled = false
  let active = true

  const subscription = actor.subscribe({
    next: observer.next
      ? () => {
          if (scheduled || !active) {
            return
          }
          scheduled = true
          queueMicrotask(() => {
            scheduled = false
            if (active) {
              observer.next?.()
            }
          })
        }
      : undefined,
    error: observer.error,
    complete: observer.complete,
  })

  return {
    unsubscribe: () => {
      active = false
      subscription.unsubscribe()
    },
  }
}
