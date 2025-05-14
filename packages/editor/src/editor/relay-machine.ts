import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {emit, setup, type ActorRefFrom} from 'xstate'
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
      type: 'done loading'
    }
  | {
      type: 'editable'
    }
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
  type: 'unset'
  previousValue: Array<PortableTextBlock>
}

export type RelayActor = ActorRefFrom<typeof relayMachine>

export const relayMachine = setup({
  types: {
    events: {} as InternalEditorEmittedEvent,
    emitted: {} as InternalEditorEmittedEvent,
  },
}).createMachine({
  id: 'relay',
  on: {
    '*': {
      actions: emit(({event}) => event),
    },
  },
})
