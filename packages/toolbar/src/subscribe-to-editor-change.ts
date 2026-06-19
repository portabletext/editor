import type {Editor} from '@portabletext/editor'

/**
 * Subscribe to all editor events, coalescing a synchronous burst of events
 * into a single `listener` call on the next microtask.
 *
 * The toolbar's button listeners recompute a selection-dependent selector
 * (active annotation/decorator/style/list, active style, popover position)
 * on every editor event. A single user action can emit one event per
 * underlying operation, so deleting a large selection emits an event per
 * removed block while the selection is still large. Recomputing each
 * O(selection) selector once per event is then O(n^2) and blocks the main
 * thread.
 *
 * Only the settled state matters for what the toolbar shows, so coalescing
 * to the trailing edge runs each selector once per burst instead of once
 * per event, turning the per-action cost back into a single O(selection)
 * pass. A pending microtask that fires after unsubscribe is dropped.
 */
export function subscribeToEditorChange(
  editor: Editor,
  listener: () => void,
): () => void {
  let scheduled = false
  let subscribed = true

  const subscription = editor.on('*', () => {
    if (scheduled) {
      return
    }
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (subscribed) {
        listener()
      }
    })
  })

  return () => {
    subscribed = false
    subscription.unsubscribe()
  }
}
