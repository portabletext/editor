import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {
  assertEvent,
  assign,
  emit,
  sendParent,
  setup,
  type ActorRefFrom,
} from 'xstate'
import type {
  Editor,
  EditorSelection,
  RangeDecoration,
  RangeDecorationOnMovedDetails,
  SchemaDefinition,
} from '../src'
import type {Behavior} from '../src/behaviors/behavior.types.behavior'

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
      editorRef: React.RefObject<Editor | null>
      keyGenerator: () => string
      selection: EditorSelection
    },
    input: {} as {
      editorRef: React.RefObject<Editor | null>
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
    editorRef: input.editorRef,
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
      editorRef: React.RefObject<Editor | null>
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
  | {
      type: 'update range decorations'
      rangeDecorations: Array<RangeDecoration>
    }
  | {
      type: 'update range decoration selection'
      details: RangeDecorationOnMovedDetails
    }

export type TestActorRef = ActorRefFrom<typeof testMachine>

export const testMachine = setup({
  types: {
    context: {} as {
      behaviors: Array<Behavior>
      editorIdGenerator: () => string
      editors: Array<EditorActorRef>
      rangeDecorations?: Array<RangeDecoration>
      schemaDefinition: SchemaDefinition
      value: Array<PortableTextBlock> | undefined
    },
    input: {} as {
      behaviors?: Array<Behavior>
      rangeDecorations?: Array<RangeDecoration>
      schemaDefinition: SchemaDefinition
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
              editorRef: event.editorRef,
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
    'assign range decorations': assign({
      rangeDecorations: ({event}) => {
        assertEvent(event, 'update range decorations')
        return event.rangeDecorations
      },
    }),
    'assign range decoration selection': assign({
      rangeDecorations: ({context, event}) => {
        assertEvent(event, 'update range decoration selection')

        return context.rangeDecorations?.flatMap((rangeDecoration) => {
          if (
            rangeDecoration.payload?.id ===
            event.details.rangeDecoration.payload?.id
          ) {
            if (!event.details.newSelection) {
              return []
            }

            return [
              {
                selection: event.details.newSelection,
                payload: rangeDecoration.payload,
                onMoved: rangeDecoration.onMoved,
                component: rangeDecoration.component,
              },
            ]
          }

          return [rangeDecoration]
        })
      },
    }),
  },
  actors: {
    'editor machine': editorMachine,
  },
}).createMachine({
  id: 'test',
  context: ({input}) => ({
    behaviors: input.behaviors ?? [],
    editorIdGenerator: createKeyGenerator('e'),
    editors: [],
    rangeDecorations: input.rangeDecorations,
    schemaDefinition: input.schemaDefinition,
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
    'update range decorations': {
      actions: ['assign range decorations'],
    },
    'update range decoration selection': {
      actions: ['assign range decoration selection'],
    },
  },
})

function createKeyGenerator(prefix: string) {
  let index = 0
  return function keyGenerator(): string {
    return `${prefix}${index++}`
  }
}
