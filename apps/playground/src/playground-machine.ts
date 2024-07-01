import {type MutationChange} from '@portabletext/editor'
import {applyAll} from '@portabletext/patches'
import {PortableTextBlock} from '@sanity/types'
import {
  ActorRefFrom,
  assertEvent,
  assign,
  createActor,
  raise,
  sendParent,
  setup,
  stopChild,
} from 'xstate'
import {generateColor} from './generate-color'

export type EditorActorRef = ActorRefFrom<typeof editorMachine>

const editorMachine = setup({
  types: {
    context: {} as {
      color: string
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as
      | MutationChange
      | {type: 'patches'; patches: MutationChange['patches']; snapshot: MutationChange['snapshot']}
      | {type: 'value'; value?: Array<PortableTextBlock>}
      | {type: 'remove'},
    input: {} as {color: string; value: Array<PortableTextBlock> | undefined},
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    color: input.color,
    value: input.value,
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
})

const generateEditorColor = generateColor('100')

export const playgroundMachine = setup({
  types: {
    context: {} as {
      editors: Array<EditorActorRef>
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as
      | {type: 'add editor'}
      | ({type: 'editor.mutation'; editorId: EditorActorRef['id']} & Omit<MutationChange, 'type'>)
      | {type: 'editor.remove'; editorId: EditorActorRef['id']},
  },
  actions: {
    'broadcast patches': ({context, event}) => {
      assertEvent(event, 'editor.mutation')
      context.editors.forEach((editor) => {
        editor.send({
          type: 'patches',
          patches: event.patches.map((patch) => ({
            origin: event.editorId === editor.id ? 'local' : 'remote',
            ...patch,
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
    'broadcast value': ({context, event}) => {
      assertEvent(event, 'editor.mutation')
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
            input: {color: generateEditorColor.next().value, value: context.value},
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
  context: {
    value: undefined,
    editors: [],
  },
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

export const playgroundActor = createActor(playgroundMachine)

playgroundActor.start()
