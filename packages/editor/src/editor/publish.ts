import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {FocusEvent} from 'react'
import type {Subscription} from 'xstate'
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

/**
 * Internal publication surface that backs `editor.on`.
 *
 * Selection events are deduplicated against the previous selection with a
 * focus-flag carve-out: when the previous event was `focused`, the next
 * `selection` event is always re-emitted even when the selection reference
 * hasn't changed. This carve-out exists because some consumers care about
 * "user just focused, here's where the caret is" even when nothing moved.
 *
 * Matches the xstate `ActorRef['on']` signature so `editor.on` keeps the same
 * type-narrowing behavior over `EditorEmittedEvent['type']` + the `'*'`
 * wildcard.
 */
export type Publisher = {
  emit: (event: EditorEmittedEvent) => void
  on: <TType extends EditorEmittedEvent['type'] | '*'>(
    type: TType,
    listener: (
      event: EditorEmittedEvent & (TType extends '*' ? unknown : {type: TType}),
    ) => void,
  ) => Subscription
}

export function createPublisher(): Publisher {
  const listeners = new Map<string, Set<(event: EditorEmittedEvent) => void>>()
  let prevSelection: EditorSelection = null
  let lastEventWasFocused = false

  return {
    emit(event) {
      if (event.type === 'selection') {
        if (!lastEventWasFocused && prevSelection === event.selection) {
          return
        }
        prevSelection = event.selection
      }
      lastEventWasFocused = event.type === 'focused'

      listeners.get(event.type)?.forEach((listener) => {
        listener(event)
      })
      listeners.get('*')?.forEach((listener) => {
        listener(event)
      })
    },
    on(type, listener) {
      const set =
        listeners.get(type) ?? new Set<(event: EditorEmittedEvent) => void>()
      set.add(listener as (event: EditorEmittedEvent) => void)
      listeners.set(type, set)

      return {
        unsubscribe() {
          set.delete(listener as (event: EditorEmittedEvent) => void)
        },
      }
    },
  }
}
