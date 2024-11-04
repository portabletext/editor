import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {ComponentProps} from 'react'
import {
  assertEvent,
  assign,
  emit,
  sendParent,
  setup,
  type ActorRefFrom,
} from 'xstate'
import {
  coreBehaviors,
  type EditorSelection,
  type PortableTextEditor,
} from '../src'
import type {Behavior} from '../src/editor/behavior/behavior.types'

type MutationEvent = {
  type: 'mutation'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
}

type PatchesEvent = {
  type: 'patches'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
}

type SelectionEvent = {
  type: 'selection'
  selection: EditorSelection
}

type FocusEvent = {
  type: 'focus'
}

export type EditorEvent =
  | MutationEvent
  | PatchesEvent
  | SelectionEvent
  | FocusEvent

export type EditorActorRef = ActorRefFrom<typeof editorMachine>

const editorMachine = setup({
  types: {
    context: {} as {
      keyGenerator: () => string
      selection: EditorSelection
    },
    input: {} as {
      keyGenerator: () => string
    },
    events: {} as EditorEvent,
    emitted: {} as PatchesEvent | FocusEvent,
  },
  actions: {
    'assign selection': assign({
      selection: ({event}) => {
        assertEvent(event, 'selection')
        return event.selection
      },
    }),
    'emit focus': emit({type: 'focus'}),
    'emit patches': emit(({event}) => {
      assertEvent(event, 'patches')
      return event
    }),
    'send mutation to parent': sendParent(({event, self}) => {
      assertEvent(event, 'mutation')
      return {
        ...event,
        type: 'editor.mutation',
        editorId: self.id,
      }
    }),
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    keyGenerator: input.keyGenerator,
    selection: null,
  }),
  on: {
    mutation: {
      actions: ['send mutation to parent'],
    },
    patches: {
      actions: ['emit patches'],
    },
    selection: {
      actions: 'assign selection',
    },
    focus: {
      actions: ['emit focus'],
    },
  },
})

export type TestMachineEvent =
  | {
      type: 'add editor'
    }
  | {
      type: 'editor.mutation'
      editorId: string
      patches: MutationEvent['patches']
      snapshot: MutationEvent['snapshot']
    }
  | {
      type: 'update behaviors'
      behaviors: Array<Behavior>
    }

export type TestActorRef = ActorRefFrom<typeof testMachine>

export const testMachine = setup({
  types: {
    context: {} as {
      behaviors: Array<Behavior>
      editorIdGenerator: () => string
      editors: Array<EditorActorRef>
      schema: ComponentProps<typeof PortableTextEditor>['schemaType']
      value: Array<PortableTextBlock> | undefined
    },
    input: {} as {
      behaviors?: Array<Behavior>
      schema: ComponentProps<typeof PortableTextEditor>['schemaType']
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as TestMachineEvent,
  },
  actions: {
    'assign editor': assign({
      editors: ({context, event, spawn}) => {
        assertEvent(event, 'add editor')
        const editorId = context.editorIdGenerator()
        return [
          ...context.editors,
          spawn('editor machine', {
            input: {
              keyGenerator: createKeyGenerator(`${editorId}-k`),
            },
            id: editorId,
          }),
        ]
      },
    }),
    'broadcast patches': ({context, event}) => {
      assertEvent(event, 'editor.mutation')
      for (const editor of context.editors) {
        editor.send({
          type: 'patches',
          patches: event.patches.map((patch) => ({
            ...patch,
            origin: event.editorId === editor.id ? 'local' : 'remote',
          })),
          snapshot: event.snapshot,
        })
      }
    },
    'update value': assign({
      value: ({context, event}) => {
        assertEvent(event, 'editor.mutation')
        return applyAll(context.value, event.patches)
      },
    }),
    'assign behaviors': assign({
      behaviors: ({event}) => {
        assertEvent(event, 'update behaviors')
        return event.behaviors
      },
    }),
  },
  actors: {
    'editor machine': editorMachine,
  },
}).createMachine({
  id: 'test',
  context: ({input}) => ({
    behaviors: input.behaviors ?? coreBehaviors,
    editorIdGenerator: createKeyGenerator('e'),
    editors: [],
    schema: input.schema,
    value: input.value,
  }),
  on: {
    'add editor': {
      actions: 'assign editor',
    },
    'editor.mutation': {
      actions: ['broadcast patches', 'update value'],
    },
    'update behaviors': {
      actions: ['assign behaviors'],
    },
  },
})

function createKeyGenerator(prefix: string) {
  let index = 0
  return function keyGenerator(): string {
    return `${prefix}${index++}`
  }
}
