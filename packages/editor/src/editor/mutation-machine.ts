import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {ActorRefFrom} from 'xstate'
import {
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  not,
  raise,
  setup,
  type AnyEventObject,
} from 'xstate'
import {debug} from '../internal-utils/debug'
import {Editor} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorSchema} from './editor-schema'
import type {PatchEvent} from './relay-machine'

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
          type: 'emit changes'
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
    'set is deferring mutations': ({context}) => {
      context.slateEditor.isDeferringMutations = true
    },
    'emit mutations': enqueueActions(({context, enqueue}) => {
      for (const bulk of context.pendingMutations) {
        enqueue.emit({
          type: 'mutation',
          patches: bulk.patches,
          snapshot: bulk.value,
        })
      }
      context.slateEditor.isDeferringMutations = false
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
    'mutation interval': fromCallback(({sendBack}) => {
      const interval = setInterval(
        () => {
          sendBack({type: 'emit changes'})
        },
        // @ts-expect-error - dot notation required for Vite to replace at build time
        process.env.NODE_ENV === 'test' ? 250 : 1000,
      )

      return () => {
        clearInterval(interval)
      }
    }),
  },
  guards: {
    'is read-only': ({context}) => context.readOnly,
    'slate is normalizing': ({context}) =>
      Editor.isNormalizing(context.slateEditor),
  },
  delays: {
    'type debounce': 250,
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
              debug.mutation('entry: typing->idle')
            },
          ],
          exit: [
            () => {
              debug.mutation('exit: typing->idle')
              debug.mutation('entry: typing->typing')
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
                raise({type: 'emit changes'}),
                () => {
                  debug.mutation('exit: typing->typing')
                },
              ],
            },
          },
          on: {
            'not typing': {
              target: 'idle',
              actions: [raise({type: 'emit changes'})],
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
              debug.mutation('entry: mutations->idle')
            },
          ],
          exit: [
            () => {
              debug.mutation('exit: mutations->idle')
            },
          ],
          on: {
            patch: [
              {
                guard: 'is read-only',
                actions: [
                  'set is deferring mutations',
                  'defer patch',
                  'defer mutation',
                ],
                target: 'has pending mutations',
              },
              {
                actions: [
                  'set is deferring mutations',
                  'emit patch',
                  'defer mutation',
                ],
                target: 'has pending mutations',
              },
            ],
          },
        },
        'has pending mutations': {
          entry: [
            () => {
              debug.mutation('entry: mutations->has pending mutations')
            },
          ],
          exit: [
            () => {
              debug.mutation('exit: mutations->has pending mutations')
            },
          ],
          invoke: {
            src: 'mutation interval',
          },
          on: {
            'emit changes': {
              guard: and([not('is read-only'), 'slate is normalizing']),
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
