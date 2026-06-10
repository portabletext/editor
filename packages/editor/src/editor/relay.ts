import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {FocusEvent} from 'react'
import type {EditorSelection, InvalidValueResolution} from '../types/editor'

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

type InternalEditorEmittedEvent = EditorEmittedEvent | UnsetEvent

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

type UnsetEvent = {
  /**
   * @deprecated Use `'patch'` events instead
   */
  type: 'unset'
  previousValue: Array<PortableTextBlock>
}

type RelayListener = (event: InternalEditorEmittedEvent) => void

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
 */
export type Relay = {
  send: (event: InternalEditorEmittedEvent) => void
  on: <TType extends InternalEditorEmittedEvent['type'] | '*'>(
    type: TType,
    listener: (
      event: InternalEditorEmittedEvent &
        (TType extends '*' ? unknown : {type: TType}),
    ) => void,
  ) => {unsubscribe: () => void}
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
  const mailbox: Array<InternalEditorEmittedEvent> = []
  let status: 'created' | 'started' | 'stopped' = 'created'
  let dispatching = false
  let prevSelection: EditorSelection = null
  let lastEventWasFocused = false

  function deliver(event: InternalEditorEmittedEvent) {
    const typeListeners = listeners.get(event.type)
    if (typeListeners) {
      for (let index = 0; index < typeListeners.length; index++) {
        typeListeners[index]?.(event)
      }
    }

    const everyEventListeners = listeners.get('*')
    if (everyEventListeners) {
      for (let index = 0; index < everyEventListeners.length; index++) {
        everyEventListeners[index]?.(event)
      }
    }
  }

  function dispatch(event: InternalEditorEmittedEvent) {
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
      // A throwing listener must not leave the relay stuck mid-dispatch.
      // Drop everything up to and including the throwing event and let the
      // error propagate; later sends keep working.
      mailbox.splice(0, index)
      dispatching = false
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
    on: (type, listener) => {
      listeners.set(type, [
        ...(listeners.get(type) ?? []),
        listener as RelayListener,
      ])

      return {
        unsubscribe: () => {
          const current = listeners.get(type) ?? []
          const index = current.indexOf(listener as RelayListener)

          if (index !== -1) {
            listeners.set(type, [
              ...current.slice(0, index),
              ...current.slice(index + 1),
            ])
          }
        },
      }
    },
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
