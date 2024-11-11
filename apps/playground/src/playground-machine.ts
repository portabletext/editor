import type {MutationChange, PortableTextBlock} from '@portabletext/editor'
import {applyAll, type Patch} from '@portabletext/patches'
import {v4 as uuid} from 'uuid'
import {
  assertEvent,
  assign,
  emit,
  fromPromise,
  raise,
  sendParent,
  setup,
  stopChild,
  type ActorRefFrom,
} from 'xstate'
import type {generateColor} from './generate-color'
import {createKeyGenerator} from './key-generator'

const copyToTextClipboardActor = fromPromise(
  ({input}: {input: {text: string}}) => {
    const blob = new Blob([input.text], {type: 'text/plain'})
    const data = [new ClipboardItem({'text/plain': blob})]

    return navigator.clipboard.write(data)
  },
)

export type EditorActorRef = ActorRefFrom<typeof editorMachine>

const editorMachine = setup({
  types: {
    context: {} as {
      color: string
      value: Array<PortableTextBlock> | undefined
      patchesReceived: Array<Patch & {new: boolean; id: string}>
      keyGenerator: () => string
      readOnly: boolean
    },
    events: {} as
      | MutationChange
      | {
          type: 'patches'
          patches: MutationChange['patches']
          snapshot: MutationChange['snapshot']
        }
      | {type: 'value'; value?: Array<PortableTextBlock>}
      | {type: 'remove'}
      | {type: 'clear stored patches'}
      | {type: 'copy patches'}
      | {type: 'toggle patches preview'}
      | {type: 'toggle selection preview'}
      | {type: 'toggle readOnly'},
    emitted: {} as {
      type: 'patches'
      patches: MutationChange['patches']
      snapshot: MutationChange['snapshot']
    },
    input: {} as {
      color: string
      value: Array<PortableTextBlock> | undefined
      keyGenerator: () => string
    },
  },
  actions: {
    'store patches received': assign({
      patchesReceived: ({context, event}) => {
        assertEvent(event, 'patches')
        return [
          ...context.patchesReceived.map((patch) => ({...patch, new: false})),
          ...event.patches.map((patch) => ({...patch, new: true, id: uuid()})),
        ]
      },
    }),
    'emitPatches': emit(({event}) => {
      assertEvent(event, 'patches')
      return event
    }),
    'remove patches from context': assign({
      patchesReceived: [],
    }),
  },
  actors: {
    'copy text to clipboard': copyToTextClipboardActor,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    color: input.color,
    value: input.value,
    patchesReceived: [],
    keyGenerator: input.keyGenerator,
    readOnly: false,
  }),
  on: {
    'mutation': {
      actions: [
        sendParent(({event, self}) => ({
          ...event,
          type: 'editor.mutation',
          editorId: self.id,
        })),
      ],
    },
    'patches': {
      actions: ['store patches received', 'emitPatches'],
    },
    'value': {
      actions: [
        assign({
          value: ({event}) => event.value,
        }),
      ],
    },
    'remove': {
      actions: [
        sendParent(({self}) => ({type: 'editor.remove', editorId: self.id})),
      ],
    },
    'clear stored patches': {
      actions: ['remove patches from context'],
    },
    'toggle readOnly': {
      actions: assign({
        readOnly: ({context}) => !context.readOnly,
      }),
    },
  },
  type: 'parallel',
  states: {
    'patches preview': {
      initial: 'shown',
      states: {
        hidden: {on: {'toggle patches preview': {target: 'shown'}}},
        shown: {on: {'toggle patches preview': {target: 'hidden'}}},
      },
    },
    'selection preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle selection preview': {target: 'shown'}}},
        shown: {on: {'toggle selection preview': {target: 'hidden'}}},
      },
    },
    'copying patches': {
      initial: 'idle',
      states: {
        idle: {
          on: {
            'copy patches': {target: 'copying'},
          },
        },
        copying: {
          invoke: {
            src: 'copy text to clipboard',
            input: ({context}) => ({
              type: 'text/plain',
              text: JSON.stringify(context.patchesReceived),
            }),
            onDone: {
              target: 'idle',
            },
            onError: {
              target: 'idle',
              actions: [
                ({event}) => {
                  console.error(event)
                },
              ],
            },
          },
        },
      },
    },
  },
})

export type PlaygroundActorRef = ActorRefFrom<typeof playgroundMachine>

export const playgroundMachine = setup({
  types: {
    context: {} as {
      editorIdGenerator: Generator<string, string>
      colorGenerator: ReturnType<typeof generateColor>
      editors: Array<EditorActorRef>
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as
      | {type: 'add editor'}
      | ({type: 'editor.mutation'; editorId: EditorActorRef['id']} & Omit<
          MutationChange,
          'type'
        >)
      | {type: 'editor.remove'; editorId: EditorActorRef['id']}
      | {type: 'toggle value'},
    input: {} as {
      editorIdGenerator: Generator<string, string>
      colorGenerator: ReturnType<typeof generateColor>
    },
  },
  actions: {
    'broadcast patches': ({context, event}) => {
      assertEvent(event, 'editor.mutation')
      context.editors.forEach((editor) => {
        editor.send({
          type: 'patches',
          patches: event.patches.map((patch) => ({
            ...patch,
            origin: event.editorId === editor.id ? 'local' : 'remote',
          })),
          snapshot: event.snapshot,
        })
      })
    },
    'update value': assign({
      value: ({context, event}) => {
        assertEvent(event, 'editor.mutation')
        return applyAll(context.value, event.patches)
      },
    }),
    'broadcast value': ({context}) => {
      const value = context.value
      if (value !== null) {
        context.editors.forEach((editor) => {
          editor.send({
            type: 'value',
            value,
          })
        })
      }
    },
    'add editor to context': assign({
      editors: ({context, event, spawn}) => {
        assertEvent(event, 'add editor')
        const editorId = context.editorIdGenerator.next().value
        return [
          ...context.editors,
          spawn('editor machine', {
            input: {
              color: context.colorGenerator.next().value,
              value: context.value,
              keyGenerator: createKeyGenerator(`e${editorId}-k`),
            },
            id: `editor-${editorId}`,
          }),
        ]
      },
    }),
    'stop editor': stopChild(({context, event}) => {
      assertEvent(event, 'editor.remove')
      return context.editors.find((editor) => editor.id === event.editorId)!
    }),
    'remove editor from context': assign({
      editors: ({context, event}) => {
        assertEvent(event, 'editor.remove')
        return context.editors.filter((editor) => editor.id !== event.editorId)
      },
    }),
  },
  actors: {
    'editor machine': editorMachine,
  },
}).createMachine({
  id: 'playground',
  context: ({input}) => ({
    editorIdGenerator: input.editorIdGenerator,
    colorGenerator: input.colorGenerator,
    value: undefined,
    editors: [],
  }),
  on: {
    'add editor': {
      actions: ['add editor to context'],
    },
    'editor.remove': {
      actions: ['stop editor', 'remove editor from context'],
    },
    'editor.mutation': {
      actions: ['broadcast patches', 'update value', 'broadcast value'],
    },
  },
  entry: [raise({type: 'add editor'}), raise({type: 'add editor'})],
  initial: 'value shown',
  states: {
    'value shown': {on: {'toggle value': {target: 'value hidden'}}},
    'value hidden': {on: {'toggle value': {target: 'value shown'}}},
  },
})
