import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {FocusEvent} from 'react'
import type {EditorSelection, InvalidValueResolution} from '../types/editor'
import type {Operation} from '../types/operation'

/**
 * @public
 */
export type EditorEmittedEvent =
  | {
      type: 'blurred'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | {
      /**
       * @deprecated Will be removed in the next major version
       */
      type: 'done loading'
    }
  | {
      type: 'editable'
    }
  | ErrorEvent
  | {
      type: 'focused'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | {
      type: 'invalid value'
      resolution: InvalidValueResolution | null
      value: Array<PortableTextBlock> | undefined
    }
  | {
      /**
       * @deprecated Will be removed in the next major version
       */
      type: 'loading'
    }
  | MutationEvent
  | {
      /**
       * @beta
       * Emitted synchronously for every document-changing operation the
       * engine applies (`set.selection` is excluded; the `selection` event
       * serves selection observers), including operations from initial
       * value sync and normalization, unlike `patch` and `mutation`
       * events, which are held back until the editor is dirty. Do not
       * dispatch editor events from a listener; read current state via
       * `editor.getSnapshot()`.
       *
       * The `operation` object is the engine's own, passed by reference:
       * treat it as read-only and copy anything you retain. Normalization
       * fix operations are delivered adjacent to the operation that
       * triggered them, but not in a guaranteed order; see the
       * {@link Operation} docs for the delivery-order contract. Subscribers
       * attached after setup receive only subsequent operations: seed
       * derived state from `editor.getSnapshot()` when subscribing, then
       * apply deltas.
       */
      type: 'operation'
      operation: Operation
    }
  | PatchEvent
  | {
      type: 'read only'
    }
  | {
      type: 'ready'
    }
  | {
      type: 'selection'
      selection: EditorSelection
    }
  | {
      type: 'value changed'
      value: Array<PortableTextBlock> | undefined
    }

/**
 * @deprecated The event is no longer emitted
 */
type ErrorEvent = {
  type: 'error'
  name: string
  description: string
  data: unknown
}

/**
 * @public
 */
export type MutationEvent = {
  type: 'mutation'
  patches: Array<Patch>
  value: Array<PortableTextBlock> | undefined
}

export type PatchEvent = {
  type: 'patch'
  patch: Patch
}

type RelayListener = (event: EditorEmittedEvent) => void

/**
 * Controls how a listener registered with `editor.on(...)` is delivered.
 *
 * - `batch: false` (default): the listener runs synchronously for every
 *   matching event and receives a single event.
 * - `batch: true`: the listener is called once per *burst* with the array of
 *   every matching event of that burst, in delivery order (nothing dropped).
 *   A burst is every event emitted before control returns to the event loop,
 *   i.e. everything one synchronous `editor.send` (or a synchronous cascade
 *   of them) produces, delivered on the trailing microtask. This is the same
 *   boundary at which the editor settles and notifies its own state, and
 *   normalization runs synchronously within it, so a batched listener sees one
 *   fully-applied, normalized change per call, never a half-normalized
 *   intermediate. Note that two synchronous `editor.send` calls coalesce into
 *   one burst. For persistence-aligned batching, the `mutation` event already
 *   coalesces patches on its own (debounced) schedule.
 */
export type EditorEventListenerOptions = {
  batch?: boolean
}

/**
 * Fans editor events out to consumers (`editor.on(...)`).
 *
 * Guarantees:
 *
 * - Listeners run synchronously, in subscription order, with `'*'` listeners
 *   after type-specific ones.
 * - Events sent by a listener during dispatch are queued and dispatched once
 *   the current event has been delivered to every listener.
 * - Events sent before `start()` are buffered and dispatched on start;
 *   events sent after `stop()` are dropped.
 * - Consecutive `selection` events carrying the same selection reference are
 *   deduplicated, unless the previous event was `focused`.
 * - A throwing listener does not prevent delivery to the remaining
 *   listeners; the error is reported via `console.error`.
 */
export type Relay = {
  send: (event: EditorEmittedEvent) => void
  on: {
    <TType extends EditorEmittedEvent['type'] | '*'>(
      type: TType,
      listener: (
        events: Array<
          EditorEmittedEvent & (TType extends '*' ? unknown : {type: TType})
        >,
      ) => void,
      options: {batch: true},
    ): {unsubscribe: () => void}
    <TType extends EditorEmittedEvent['type'] | '*'>(
      type: TType,
      listener: (
        event: EditorEmittedEvent &
          (TType extends '*' ? unknown : {type: TType}),
      ) => void,
      options?: {batch?: false},
    ): {unsubscribe: () => void}
  }
  start: () => void
  stop: () => void
}

export function createRelay(): Relay {
  // Copy-on-write listener arrays: dispatch happens per editor event while
  // subscriptions are rare, so subscribing and unsubscribing replace the
  // array. `deliver` reads `listeners.get(...)` once at delivery entry and
  // iterates that local reference, so listeners that subscribe or
  // unsubscribe during a pass cannot affect who receives the in-flight
  // event.
  const listeners = new Map<string, Array<RelayListener>>()
  const mailbox: Array<EditorEmittedEvent> = []
  let status: 'created' | 'started' | 'stopped' = 'created'
  let dispatching = false
  let prevSelection: EditorSelection = null
  let lastEventWasFocused = false

  function deliver(event: EditorEmittedEvent) {
    const typeListeners = listeners.get(event.type)
    if (typeListeners) {
      for (let index = 0; index < typeListeners.length; index++) {
        callListener(typeListeners[index], event)
      }
    }

    const everyEventListeners = listeners.get('*')
    if (everyEventListeners) {
      for (let index = 0; index < everyEventListeners.length; index++) {
        callListener(everyEventListeners[index], event)
      }
    }
  }

  function callListener(
    listener: RelayListener | undefined,
    event: EditorEmittedEvent,
  ) {
    try {
      listener?.(event)
    } catch (error) {
      // One consumer's throwing listener must not starve other listeners of
      // the event, nor break the editor flow that emitted it — patch events,
      // for example, are sent synchronously from the mutation batcher.
      console.error(error)
    }
  }

  function dispatch(event: EditorEmittedEvent) {
    if (event.type === 'focused') {
      lastEventWasFocused = true
      deliver(event)
      return
    }

    if (event.type === 'selection') {
      if (!lastEventWasFocused && prevSelection === event.selection) {
        // The selection reference is stable between mutations, so an
        // identical reference means nothing changed for consumers. A
        // preceding `focused` event still warrants a `selection` event so
        // consumers can react to the selection becoming active.
        return
      }
      prevSelection = event.selection
      deliver(event)
      lastEventWasFocused = false
      return
    }

    deliver(event)
    lastEventWasFocused = false
  }

  function drainMailbox() {
    if (dispatching) {
      return
    }
    dispatching = true
    // Listeners may `send` during dispatch; those events append to the
    // mailbox and are dispatched here once the current event has been
    // delivered to every listener.
    let index = 0
    try {
      while (index < mailbox.length) {
        const event = mailbox[index]
        index++
        if (event) {
          dispatch(event)
        }
      }
    } finally {
      // Listener errors are contained in `callListener`, so this only
      // triggers on unexpected dispatch failures — recover rather than
      // staying stuck mid-dispatch: drop the processed events and let the
      // error propagate; later sends keep working.
      mailbox.splice(0, index)
      dispatching = false
    }
  }

  // `batch` listeners are stored as a coalescing wrapper: `deliver` calls the
  // wrapper per event (cheap: record the event, schedule once), and the
  // original listener runs once on the trailing microtask with the array of
  // every event in the burst, in delivery order. This collapses a burst (e.g.
  // one operation event per block during a large delete) into a single call
  // without dropping any event.
  const on = (
    type: EditorEmittedEvent['type'] | '*',
    listener: (
      eventOrEvents: EditorEmittedEvent | Array<EditorEmittedEvent>,
    ) => void,
    options?: EditorEventListenerOptions,
  ): {unsubscribe: () => void} => {
    let stored: RelayListener
    let unsubscribed = false

    if (options?.batch) {
      let scheduled = false
      const pendingEvents: Array<EditorEmittedEvent> = []
      stored = (event) => {
        pendingEvents.push(event)
        if (scheduled) {
          return
        }
        scheduled = true
        queueMicrotask(() => {
          scheduled = false
          if (unsubscribed || status === 'stopped') {
            pendingEvents.length = 0
            return
          }
          // `scheduled` is only set after a push and the unsubscribed/stopped
          // branch returned above, so the burst always has at least one event.
          const events = pendingEvents.slice()
          pendingEvents.length = 0
          try {
            listener(events)
          } catch (error) {
            // Contain a throwing listener, matching `callListener`.
            console.error(error)
          }
        })
      }
    } else {
      stored = listener
    }

    listeners.set(type, [...(listeners.get(type) ?? []), stored])

    return {
      unsubscribe: () => {
        unsubscribed = true
        const current = listeners.get(type) ?? []
        const index = current.indexOf(stored)

        if (index !== -1) {
          listeners.set(type, [
            ...current.slice(0, index),
            ...current.slice(index + 1),
          ])
        }
      },
    }
  }

  return {
    send: (event) => {
      if (status === 'stopped') {
        return
      }

      mailbox.push(event)

      if (status === 'started') {
        drainMailbox()
      }
    },
    on: on as Relay['on'],
    start: () => {
      status = 'started'
      drainMailbox()
    },
    stop: () => {
      status = 'stopped'
      mailbox.length = 0
    },
  }
}
