import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {Editor} from 'slate'
import {
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  not,
  setup,
  stateIn,
  type AnyEventObject,
} from 'xstate'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './define-schema'

/**
 * Makes sure editor mutation events are debounced
 */
export const mutationMachine = setup({
  types: {
    context: {} as {
      pendingMutations: Array<{
        actionId?: string
        value: Array<PortableTextBlock> | undefined
        patches: Array<Patch>
      }>
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    events: {} as
      | {
          type: 'patch'
          patch: Patch
          actionId?: string
          value: Array<PortableTextBlock>
        }
      | {
          type: 'typing'
        }
      | {
          type: 'not typing'
        },
    input: {} as {
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    emitted: {} as
      | {
          type: 'has pending patches'
        }
      | {
          type: 'mutation'
          patches: Array<Patch>
          snapshot: Array<PortableTextBlock> | undefined
        },
  },
  actions: {
    'emit has pending patches': emit({type: 'has pending patches'}),
    'emit mutations': enqueueActions(({context, enqueue}) => {
      for (const bulk of context.pendingMutations) {
        enqueue.emit({
          type: 'mutation',
          patches: bulk.patches,
          snapshot: bulk.value,
        })
      }
    }),
    'clear pending mutations': assign({
      pendingMutations: [],
    }),
    'defer patch': assign({
      pendingMutations: ({context, event}) => {
        assertEvent(event, 'patch')

        if (context.pendingMutations.length === 0) {
          return [
            {
              actionId: event.actionId,
              value: event.value,
              patches: [event.patch],
            },
          ]
        }

        const lastBulk = context.pendingMutations.at(-1)

        if (lastBulk && lastBulk.actionId === event.actionId) {
          return context.pendingMutations.slice(0, -1).concat({
            value: event.value,
            actionId: lastBulk.actionId,
            patches: [...lastBulk.patches, event.patch],
          })
        }

        return context.pendingMutations.concat({
          value: event.value,
          actionId: event.actionId,
          patches: [event.patch],
        })
      },
    }),
  },
  actors: {
    'type listener': fromCallback<
      AnyEventObject,
      {slateEditor: PortableTextSlateEditor},
      {type: 'typing'} | {type: 'not typing'}
    >(({input, sendBack}) => {
      const originalApply = input.slateEditor.apply

      input.slateEditor.apply = (op) => {
        if (op.type === 'insert_text' || op.type === 'remove_text') {
          sendBack({type: 'typing'})
        } else {
          sendBack({type: 'not typing'})
        }
        originalApply(op)
      }

      return () => {
        input.slateEditor.apply = originalApply
      }
    }),
  },
  guards: {
    'is typing': stateIn({typing: 'typing'}),
    'no pending mutations': ({context}) =>
      context.pendingMutations.length === 0,
    'slate is normalizing': ({context}) =>
      Editor.isNormalizing(context.slateEditor),
  },
  delays: {
    'mutation debounce': process.env.NODE_ENV === 'test' ? 250 : 0,
    'type debounce': process.env.NODE_ENV === 'test' ? 0 : 250,
  },
}).createMachine({
  id: 'mutation',
  context: ({input}) => ({
    pendingMutations: [],
    schema: input.schema,
    slateEditor: input.slateEditor,
  }),
  type: 'parallel',
  states: {
    typing: {
      initial: 'idle',
      invoke: {
        src: 'type listener',
        input: ({context}) => ({slateEditor: context.slateEditor}),
      },
      states: {
        idle: {
          on: {
            typing: {
              target: 'typing',
            },
          },
        },
        typing: {
          after: {
            'type debounce': {
              target: 'idle',
            },
          },
          on: {
            'not typing': {
              target: 'idle',
            },
            'typing': {
              target: 'typing',
              reenter: true,
            },
          },
        },
      },
    },
    mutations: {
      initial: 'idle',
      states: {
        'idle': {
          on: {
            patch: {
              actions: ['defer patch', 'emit has pending patches'],
              target: 'emitting mutations',
            },
          },
        },
        'emitting mutations': {
          after: {
            'mutation debounce': [
              {
                guard: and([not('is typing'), 'slate is normalizing']),
                target: 'idle',
                actions: ['emit mutations', 'clear pending mutations'],
              },
              {
                target: 'emitting mutations',
                reenter: true,
              },
            ],
          },
          on: {
            patch: {
              target: 'emitting mutations',
              actions: ['defer patch'],
              reenter: true,
            },
          },
        },
      },
    },
  },
})
