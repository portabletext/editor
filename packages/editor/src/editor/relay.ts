import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {FocusEvent} from 'react'
import type {EditorSelection} from '../types/editor'
import type {Operation} from '../types/operation'

/**
 * @public
 */
export type EditorEmittedEvent =
  | {
      type: 'blurred'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | ChangeEvent
  | {
      type: 'editable'
    }
  | {
      type: 'focused'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | {
      /**
       * @beta
       * Emitted synchronously for every document-changing operation the
       * engine applies (`set.selection` is excluded; the `selection` event
       * serves selection observers), including operations from initial load and
       * normalization. Do not dispatch editor events from a listener; read
       * current state via `editor.getSnapshot()`.
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
      /**
       * Where the change that produced this operation came from:
       * `'local'` for changes made in this editor (edits, undo/redo),
       * `'remote'` for changes applied from the outside (`apply`
       * and the initial load). A normalization fix
       * (a repaired key, a merged span) reports the origin of the change
       * that triggered it.
       */
      origin: 'local' | 'remote'
    }
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

/**
 * Emitted once for every change to the editor's content, synchronously, in
 * the order the changes were applied:
 *
 * - `origin: 'local'`: one user action, the outermost Behavior event and
 *   everything it raised, including normalization fixes, with operations and
 *   patches in application order. Undo and redo are one action each. A fix
 *   that no user action caused is its own local change. That covers fixes
 *   to the initial value and to content that remote patches changed, also
 *   while read-only, and fixes after a registration. Its `patches` are emitted at once.
 * - `origin: 'remote'`: one event per applied `apply` event that changes
 *   the content. Remote changes carry no `patches`.
 *
 * Every `change` of one unit of work is delivered before any `change`
 * a listener sets off while receiving them.
 *
 * `operations` are the {@link Operation}s the editor applied to its
 * content, never the inputs it received. The first load of the initial
 * value emits no `change`, except a local change when the editor fixes
 * the loaded value. A `change` never has an empty `operations` array.
 *
 * The empty block an empty editor shows is part of the snapshot and
 * never reported. One the editor inserts later, after the last block is
 * deleted or the field is unset remotely, is an insert in the change that
 * emptied the field: the local change's own `operations`, or a
 * local change with `patches: []` after a remote change.
 *
 * @beta
 */
export type ChangeEvent =
  | {
      /**
       * The document a host holds after this change. Start from the loaded
       * value, then apply each remote change's incoming `apply` patches and
       * each local change's `patches`, in order.
       *
       * A collaborator's value is passed on as it arrived, so its entries can
       * be broken at runtime. When the editor makes a correction, the local
       * change that follows carries the corrected value.
       *
       * `undefined` means the field is absent.
       */
      value: Array<PortableTextBlock> | undefined
      type: 'change'
      origin: 'local'
      operations: Array<Operation>
      patches: Array<Patch>
    }
  | {
      /**
       * The document a host holds after this change. Start from the loaded
       * value, then apply each remote change's incoming `apply` patches and
       * each local change's `patches`, in order.
       *
       * A collaborator's value is passed on as it arrived, so its entries can
       * be broken at runtime. When the editor makes a correction, the local
       * change that follows carries the corrected value.
       *
       * `undefined` means the field is absent.
       */
      value: Array<PortableTextBlock> | undefined
      type: 'change'
      origin: 'remote'
      operations: Array<Operation>
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
 *   one burst. To relay a burst in one `apply`, concatenate the `patches` of
 *   its local `change` events in order.
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
 * - Events passed to one `sendAll` are queued together, so an event a
 *   listener sends while they are delivered comes after all of them.
 * - Events sent before `start()` are buffered and dispatched on start;
 *   events sent after `stop()` are dropped.
 * - Consecutive `selection` events carrying the same selection reference are
 *   deduplicated, unless the previous event was `focused`.
 * - A throwing listener does not prevent delivery to the remaining
 *   listeners; the error is reported via `console.error`.
 */
export type Relay = {
  send: (event: EditorEmittedEvent) => void
  sendAll: (events: Array<EditorEmittedEvent>) => void
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
      // the event or break the editor flow that emitted it.
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

  function sendAll(events: Array<EditorEmittedEvent>) {
    if (status === 'stopped') {
      return
    }

    mailbox.push(...events)

    if (status === 'started') {
      drainMailbox()
    }
  }

  return {
    send: (event) => {
      sendAll([event])
    },
    sendAll,
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
