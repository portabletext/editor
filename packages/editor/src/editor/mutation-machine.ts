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
import type {ActorRefFrom} from 'xstate'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'

const debug = debugWithName('mutation-machine')

export type MutationActor = ActorRefFrom<typeof mutationMachine>

/**
 * Makes sure editor mutation events are debounced
 */
export const mutationMachine = setup({
  types: {
    context: {} as {
      pendingMutations: Array<{
        operationId?: string
        value: Array<PortableTextBlock> | undefined
        patches: Array<Patch>
      }>
      readOnly: boolean
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    events: {} as
      | {
          type: 'patch'
          patch: Patch
          operationId?: string
          value: Array<PortableTextBlock>
        }
      | {
          type: 'typing'
        }
      | {
          type: 'not typing'
        }
      | {
          type: 'update readOnly'
          readOnly: boolean
        },
    input: {} as {
      readOnly: boolean
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
    'assign readOnly': assign({
      readOnly: ({context, event}) =>
        event.type === 'update readOnly' ? event.readOnly : context.readOnly,
    }),
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
              operationId: event.operationId,
              value: event.value,
              patches: [event.patch],
            },
          ]
        }

        const lastBulk = context.pendingMutations.at(-1)

        if (lastBulk && lastBulk.operationId === event.operationId) {
          return context.pendingMutations.slice(0, -1).concat({
            value: event.value,
            operationId: lastBulk.operationId,
            patches: [...lastBulk.patches, event.patch],
          })
        }

        return context.pendingMutations.concat({
          value: event.value,
          operationId: event.operationId,
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
    'is read-only': ({context}) => context.readOnly,
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
    readOnly: input.readOnly,
    schema: input.schema,
    slateEditor: input.slateEditor,
  }),
  on: {
    'update readOnly': {
      actions: ['assign readOnly'],
    },
  },
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
          entry: [
            () => {
              debug('entry: typing->idle')
            },
          ],
          exit: [
            () => {
              debug('exit: typing->idle')
            },
          ],
          on: {
            typing: {
              target: 'typing',
            },
          },
        },
        typing: {
          entry: [
            () => {
              debug('entry: typing->typing')
            },
          ],
          exit: [
            () => {
              debug('exit: typing->typing')
            },
          ],
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
          entry: [
            () => {
              debug('entry: mutations->idle')
            },
          ],
          exit: [
            () => {
              debug('exit: mutations->idle')
            },
          ],
          on: {
            patch: {
              actions: ['defer patch', 'emit has pending patches'],
              target: 'emitting mutations',
            },
          },
        },
        'emitting mutations': {
          entry: [
            () => {
              debug('entry: mutations->emitting mutations')
            },
          ],
          exit: [
            () => {
              debug('exit: mutations->emitting mutations')
            },
          ],
          after: {
            'mutation debounce': [
              {
                guard: 'is read-only',
                target: 'read-only',
              },
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
        'read-only': {
          entry: [
            () => {
              debug('entry: mutations->read-only')
            },
          ],
          exit: [
            () => {
              debug('exit: mutations->read-only')
            },
          ],
          always: [
            {
              guard: not('is read-only'),
              target: 'emitting mutations',
            },
          ],
          on: {
            patch: {
              actions: ['defer patch'],
            },
          },
        },
      },
    },
  },
})
