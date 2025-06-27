import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {assign, emit, setup, type ActorRefFrom} from 'xstate'
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

export type InternalEditorEmittedEvent = EditorEmittedEvent | UnsetEvent

/**
 * @public
 */
export type MutationEvent = {
  type: 'mutation'
  patches: Array<Patch>
  /**
   * @deprecated Use `value` instead
   */
  snapshot: Array<PortableTextBlock> | undefined
  value: Array<PortableTextBlock> | undefined
}

export type PatchEvent = {
  type: 'patch'
  patch: Patch
}

export type UnsetEvent = {
  /**
   * @deprecated Use `'patch'` events instead
   */
  type: 'unset'
  previousValue: Array<PortableTextBlock>
}

export type RelayActor = ActorRefFrom<typeof relayMachine>

export const relayMachine = setup({
  types: {
    context: {} as {
      prevSelection: EditorSelection
      lastEventWasFocused: boolean
    },
    events: {} as InternalEditorEmittedEvent,
    emitted: {} as InternalEditorEmittedEvent,
  },
}).createMachine({
  id: 'relay',
  context: {
    prevSelection: null,
    lastEventWasFocused: false,
  },
  on: {
    'focused': {
      actions: [
        assign({
          lastEventWasFocused: true,
        }),
        emit(({event}) => event),
      ],
    },
    'selection': [
      {
        guard: ({context}) => context.lastEventWasFocused,
        actions: [
          assign({
            prevSelection: ({event}) => event.selection,
          }),
          emit(({event}) => event),
          assign({
            lastEventWasFocused: false,
          }),
        ],
      },
      {
        guard: ({context, event}) => context.prevSelection !== event.selection,
        actions: [
          assign({
            prevSelection: ({event}) => event.selection,
          }),
          emit(({event}) => event),
          assign({
            lastEventWasFocused: false,
          }),
        ],
      },
    ],
    '*': {
      actions: [
        emit(({event}) => event),
        assign({
          lastEventWasFocused: false,
        }),
      ],
    },
  },
})
