import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Editor, Range, Transforms} from 'slate'
import {
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  or,
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
export type MutationEvent = {
  type: 'mutation'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
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
      type: 'insert text'
      text: string
      editor: PortableTextSlateEditor
    }
  | {
      type: 'insert span'
      editor: PortableTextSlateEditor
      text: string
      marks: Array<string>
    }

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
    context: {} as {
      keyGenerator: () => string
      pendingEvents: Array<PatchEvent | MutationEvent>
      schema: {
        decorators: Array<string>
      }
    },
    events: {} as EditorEvent,
    emitted: {} as EditorEmittedEvent,
    input: {} as {
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
  },
  guards: {
    'selection collapsed': ({event}) => {
      assertEvent(event, 'insert text')

      return (
        event.editor.selection != null &&
        Range.isCollapsed(event.editor.selection)
      )
    },
    'selecting span': ({event}) => {
      assertEvent(event, 'insert text')

      if (!event.editor.selection) {
        return false
      }

      const [span] = Array.from(
        Editor.nodes(event.editor, {
          mode: 'lowest',
          at: event.editor.selection.focus,
          match: (n) => event.editor.isTextSpan(n),
          voids: false,
        }),
      )[0]

      return span !== undefined
    },
    'at the start of span': ({event}) => {
      assertEvent(event, 'insert text')

      if (!event.editor.selection) {
        return false
      }

      return event.editor.selection.focus.offset === 0
    },
    'at the end of span': ({event}) => {
      assertEvent(event, 'insert text')

      if (!event.editor.selection) {
        return false
      }

      const [span] = Array.from(
        Editor.nodes(event.editor, {
          mode: 'lowest',
          at: event.editor.selection.focus,
          match: (n) => event.editor.isTextSpan(n),
          voids: false,
        }),
      )[0]

      return span.text.length === event.editor.selection.focus.offset
    },
    'span has annotations': ({context, event}) => {
      assertEvent(event, 'insert text')

      if (!event.editor.selection) {
        return false
      }

      const [span] = Array.from(
        Editor.nodes(event.editor, {
          mode: 'lowest',
          at: event.editor.selection.focus,
          match: (n) => event.editor.isTextSpan(n),
          voids: false,
        }),
      )[0]

      const marks = span.marks ?? []
      const marksWithoutAnnotations = marks.filter((mark) =>
        context.schema.decorators.includes(mark),
      )

      return marks.length > marksWithoutAnnotations.length
    },
  },
  actors: {
    networkLogic,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
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
    'insert text': [
      {
        guard: and([
          'selecting span',
          'selection collapsed',
          or(['at the start of span', 'at the end of span']),
          'span has annotations',
        ]),
        actions: raise(({context, event}) => ({
          type: 'insert span',
          text: event.text,
          editor: event.editor,
          marks: (Editor.marks(event.editor)?.marks ?? []).filter((mark) =>
            context.schema.decorators.includes(mark),
          ),
        })),
      },
      {
        actions: ({event}) => {
          Editor.insertText(event.editor, event.text)
        },
      },
    ],
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
