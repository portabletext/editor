import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Editor, Transforms} from 'slate'
import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  raise,
  setup,
  type ActorRefFrom,
} from 'xstate'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../types/editor'
import type {
  Behaviour,
  BehaviourContext,
  BehaviourEvent,
} from './editor-behaviour'

export * from 'xstate/guards'

/**
 * @internal
 */
export type EditorActor = ActorRefFrom<typeof editorMachine>

const networkLogic = fromCallback(({sendBack}) => {
  const onlineHandler = () => {
    sendBack({type: 'online'})
  }
  const offlineHandler = () => {
    sendBack({type: 'offline'})
  }

  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)

  return () => {
    window.removeEventListener('online', onlineHandler)
    window.removeEventListener('offline', offlineHandler)
  }
})

/**
 * @internal
 */
export type PatchEvent = {type: 'patch'; patch: Patch}

/**
 * @internal
 */
export type EditorContext = {
  behaviours: Array<Behaviour>
  keyGenerator: () => string
  pendingEvents: Array<PatchEvent | MutationEvent>
  schema: {
    decorators: Array<string>
  }
}

/**
 * @internal
 */
export type MutationEvent = {
  type: 'mutation'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
}

/**
 * @internal
 */
export type InsertTextEvent = {
  type: 'insert text'
  text: string
  editor: PortableTextSlateEditor
}

type EditorEvent =
  | {type: 'normalizing'}
  | {type: 'done normalizing'}
  | EditorEmittedEvent
  | {
      type: 'update schema'
      schemaTypes: PortableTextMemberSchemaTypes
    }
  | {
      type: 'internal.insert text'
      text: string
      editor: PortableTextSlateEditor
    }
  | (BehaviourEvent & {editor: PortableTextSlateEditor})
  | {type: 'internal.noop'}

type EditorEmittedEvent =
  | {type: 'ready'}
  | PatchEvent
  | MutationEvent
  | {
      type: 'unset'
      previousValue: Array<PortableTextBlock>
    }
  | {
      type: 'value changed'
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'invalid value'
      resolution: InvalidValueResolution | null
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'error'
      name: string
      description: string
      data: unknown
    }
  | {type: 'selection'; selection: EditorSelection}
  | {type: 'blur'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'focus'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'online'}
  | {type: 'offline'}
  | {type: 'loading'}
  | {type: 'done loading'}

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
    emitted: {} as EditorEmittedEvent,
    input: {} as {
      behaviours: Array<Behaviour>
      keyGenerator: () => string
      schemaTypes: PortableTextMemberSchemaTypes
    },
  },
  actions: {
    'assign schema': assign({
      schema: ({event}) => {
        assertEvent(event, 'update schema')
        return {
          decorators: event.schemaTypes.decorators.map(
            (decorator) => decorator.value,
          ),
        }
      },
    }),
    'emit patch event': emit(({event}) => {
      assertEvent(event, 'patch')
      return event
    }),
    'emit mutation event': emit(({event}) => {
      assertEvent(event, 'mutation')
      return event
    }),
    'defer event': assign({
      pendingEvents: ({context, event}) => {
        assertEvent(event, ['patch', 'mutation'])
        return [...context.pendingEvents, event]
      },
    }),
    'emit pending events': enqueueActions(({context, enqueue}) => {
      for (const event of context.pendingEvents) {
        enqueue(emit(event))
      }
    }),
    'clear pending events': assign({
      pendingEvents: [],
    }),
    'on internal insert text': raise(({context, event}) => {
      assertEvent(event, 'internal.insert text')

      const behaviourEvent: BehaviourEvent = {
        ...event,
        type: 'insert text',
      }

      const [focusSpan] = event.editor.selection
        ? Array.from(
            Editor.nodes(event.editor, {
              mode: 'lowest',
              at: event.editor.selection.focus,
              match: (n) => event.editor.isTextSpan(n),
              voids: false,
            }),
          )[0]
        : [undefined]

      const behaviourContext: BehaviourContext = {
        schema: {
          decorators: context.schema.decorators,
        },
        selection: event.editor.selection,
        focusSpan,
      }

      const behaviour = context.behaviours.find(
        (behaviour) =>
          behaviour.event === behaviourEvent.type &&
          (behaviour.guard({
            context: behaviourContext,
            event: behaviourEvent,
          }) ||
            behaviour.preventDefault),
      )

      if (!behaviour) {
        return {
          type: 'insert text' as const,
          text: event.text,
          editor: event.editor,
        }
      }

      if (behaviour) {
        if (
          behaviour.guard({
            context: behaviourContext,
            event: behaviourEvent,
          })
        ) {
          return {
            ...behaviour.raise({
              context: behaviourContext,
              event: behaviourEvent,
            }),
            editor: event.editor,
          }
        }

        if (!behaviour.preventDefault) {
          return {
            type: 'insert text' as const,
            text: event.text,
            editor: event.editor,
          }
        }
      }

      return {
        type: 'internal.noop' as const,
      }
    }),
  },
  actors: {
    networkLogic,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviours: input.behaviours,
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    schema: {
      decorators: input.schemaTypes.decorators.map(
        (decorator) => decorator.value,
      ),
    },
  }),
  invoke: {
    id: 'networkLogic',
    src: 'networkLogic',
  },
  on: {
    'ready': {actions: emit(({event}) => event)},
    'unset': {actions: emit(({event}) => event)},
    'value changed': {actions: emit(({event}) => event)},
    'invalid value': {actions: emit(({event}) => event)},
    'error': {actions: emit(({event}) => event)},
    'selection': {actions: emit(({event}) => event)},
    'blur': {actions: emit(({event}) => event)},
    'focus': {actions: emit(({event}) => event)},
    'online': {actions: emit({type: 'online'})},
    'offline': {actions: emit({type: 'offline'})},
    'loading': {actions: emit({type: 'loading'})},
    'done loading': {actions: emit({type: 'done loading'})},
    'update schema': {actions: 'assign schema'},
    'internal.insert text': {
      actions: 'on internal insert text',
    },
    'insert text': {
      actions: ({event}) => {
        assertEvent(event, 'insert text')
        Editor.insertText(event.editor, event.text)
      },
    },
    'insert span': {
      actions: ({context, event}) => {
        Transforms.insertNodes(event.editor, {
          _type: 'span',
          _key: context.keyGenerator(),
          text: event.text,
          marks: event.marks,
        })
      },
    },
  },
  initial: 'pristine',
  states: {
    pristine: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            normalizing: {
              target: 'normalizing',
            },
            patch: {
              actions: 'defer event',
              target: '#editor.dirty',
            },
            mutation: {
              actions: 'defer event',
              target: '#editor.dirty',
            },
          },
        },
        normalizing: {
          on: {
            'done normalizing': {
              target: 'idle',
            },
            'patch': {
              actions: 'defer event',
            },
            'mutation': {
              actions: 'defer event',
            },
          },
        },
      },
    },
    dirty: {
      entry: ['emit pending events', 'clear pending events'],
      on: {
        patch: {
          actions: 'emit patch event',
        },
        mutation: {
          actions: 'emit mutation event',
        },
      },
    },
  },
})
