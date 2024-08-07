import {type MutationChange} from '@portabletext/editor'
import {Patch, applyAll} from '@portabletext/patches'
import {PortableTextBlock} from '@sanity/types'
import {ActorRefFrom, assertEvent, assign, emit, raise, sendParent, setup, stopChild} from 'xstate'
import {generateColor} from './generate-color'
import {v4 as uuid} from 'uuid'

export type EditorActorRef = ActorRefFrom<typeof editorMachine>

const editorMachine = setup({
  types: {
    context: {} as {
      color: string
      value: Array<PortableTextBlock> | undefined
      patchesReceived: Array<Patch & {new: boolean; id: string}>
    },
    events: {} as
      | MutationChange
      | {type: 'patches'; patches: MutationChange['patches']; snapshot: MutationChange['snapshot']}
      | {type: 'value'; value?: Array<PortableTextBlock>}
      | {type: 'remove'}
      | {type: 'toggle patches preview'}
      | {type: 'toggle value preview'}
      | {type: 'toggle selection preview'},
    emitted: {} as {
      type: 'patches'
      patches: MutationChange['patches']
      snapshot: MutationChange['snapshot']
    },
    input: {} as {color: string; value: Array<PortableTextBlock> | undefined},
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
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    color: input.color,
    value: input.value,
    patchesReceived: [],
  }),
  on: {
    mutation: {
      actions: [
        sendParent(({event, self}) => ({
          ...event,
          type: 'editor.mutation',
          editorId: self.id,
        })),
      ],
    },
    patches: {
      actions: ['store patches received', 'emitPatches'],
    },
    value: {
      actions: [
        assign({
          value: ({event}) => event.value,
        }),
      ],
    },
    remove: {
      actions: [sendParent(({self}) => ({type: 'editor.remove', editorId: self.id}))],
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
    'value preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle value preview': {target: 'shown'}}},
        shown: {on: {'toggle value preview': {target: 'hidden'}}},
      },
    },
    'selection preview': {
      initial: 'hidden',
      states: {
        hidden: {on: {'toggle selection preview': {target: 'shown'}}},
        shown: {on: {'toggle selection preview': {target: 'hidden'}}},
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
      | ({type: 'editor.mutation'; editorId: EditorActorRef['id']} & Omit<MutationChange, 'type'>)
      | {type: 'editor.remove'; editorId: EditorActorRef['id']},
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
        return [
          ...context.editors,
          spawn('editor machine', {
            input: {color: context.colorGenerator.next().value, value: context.value},
            id: context.editorIdGenerator.next().value,
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
})
