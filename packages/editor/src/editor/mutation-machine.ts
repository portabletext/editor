import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {Editor} from 'slate'
import type {ActorRefFrom} from 'xstate'
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
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {PatchEvent} from './relay-machine'

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
      pendingPatchEvents: Array<PatchEvent>
      readOnly: boolean
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
    },
    events: {} as
      | {
          type: 'mutation delay passed'
        }
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
          type: 'has pending mutations'
        }
      | {
          type: 'mutation'
          patches: Array<Patch>
          snapshot: Array<PortableTextBlock> | undefined
        }
      | PatchEvent,
  },
  actions: {
    'assign readOnly': assign({
      readOnly: ({context, event}) =>
        event.type === 'update readOnly' ? event.readOnly : context.readOnly,
    }),
    'emit patch': emit(({event}) => {
      assertEvent(event, 'patch')
      return {type: 'patch' as const, patch: event.patch}
    }),
    'emit has pending mutations': emit({type: 'has pending mutations'}),
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
    'defer mutation': assign({
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
    'clear pending patch events': assign({
      pendingPatchEvents: [],
    }),
    'defer patch': assign({
      pendingPatchEvents: ({context, event}) =>
        event.type === 'patch'
          ? [...context.pendingPatchEvents, event]
          : context.pendingPatchEvents,
    }),
    'emit pending patch events': enqueueActions(({context, enqueue}) => {
      for (const event of context.pendingPatchEvents) {
        enqueue.emit(event)
      }
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
    'mutation debouncer': fromCallback(({sendBack}) => {
      const interval = setInterval(
        () => {
          sendBack({type: 'mutation delay passed'})
        },
        process.env.NODE_ENV === 'test' ? 250 : 0,
      )

      return () => {
        clearInterval(interval)
      }
    }),
  },
  guards: {
    'is read-only': ({context}) => context.readOnly,
    'is typing': stateIn({typing: 'typing'}),
    'slate is normalizing': ({context}) =>
      Editor.isNormalizing(context.slateEditor),
  },
  delays: {
    'type debounce': process.env.NODE_ENV === 'test' ? 0 : 250,
  },
}).createMachine({
  id: 'mutation',
  context: ({input}) => ({
    pendingMutations: [],
    pendingPatchEvents: [],
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
              debug('entry: typing->typing')
            },
          ],
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
              actions: [
                () => {
                  debug('exit: typing->typing')
                },
              ],
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
            patch: [
              {
                guard: 'is read-only',
                actions: ['defer patch', 'defer mutation'],
                target: 'has pending mutations',
              },
              {
                actions: ['emit patch', 'defer mutation'],
                target: 'has pending mutations',
              },
            ],
          },
        },
        'has pending mutations': {
          entry: [
            () => {
              debug('entry: mutations->has pending mutations')
            },
            'emit has pending mutations',
          ],
          exit: [
            () => {
              debug('exit: mutations->has pending mutations')
            },
          ],
          invoke: {
            src: 'mutation debouncer',
          },
          on: {
            'mutation delay passed': {
              guard: and([
                not('is read-only'),
                not('is typing'),
                'slate is normalizing',
              ]),
              target: 'idle',
              actions: [
                'emit pending patch events',
                'clear pending patch events',
                'emit mutations',
                'clear pending mutations',
              ],
            },
            'patch': [
              {
                guard: 'is read-only',
                actions: ['defer patch', 'defer mutation'],
              },
              {
                actions: ['emit patch', 'defer mutation'],
              },
            ],
          },
        },
      },
    },
  },
})
