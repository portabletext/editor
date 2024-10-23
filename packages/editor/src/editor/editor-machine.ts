import type {Patch} from '@portabletext/patches'
import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Editor, Transforms} from 'slate'
import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  fromCallback,
  setup,
  type ActorRefFrom,
} from 'xstate'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../types/editor'
import {toPortableTextRange, toSlateRange} from '../utils/ranges'
import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {Behavior, BehaviorContext} from './behavior/behavior'

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
  | {
      type: 'before:native:key down'
      event: KeyboardEvent
      editor: PortableTextSlateEditor
    }
  | {
      type: 'before:native:insert text'
      event: InputEvent
      editor: PortableTextSlateEditor
    }
  | {
      type: 'before:insert text'
      text: string
      editor: PortableTextSlateEditor
    }
  | {
      type: 'insert text'
      text: string
      editor: PortableTextSlateEditor
    }
  | {
      type: 'insert text block'
      decorators: Array<string>
      editor: PortableTextSlateEditor
    }
  | {
      type: 'after:insert text'
      text: string
      editor: PortableTextSlateEditor
    }
  | {
      type: 'apply block style'
      style: string
      paths: Array<[KeyedSegment]>
      editor: PortableTextSlateEditor
    }
  | {
      type: 'delete text'
      selection: NonNullable<EditorSelection>
      editor: PortableTextSlateEditor
    }
  | {
      type: 'update schema'
      schema: PortableTextMemberSchemaTypes
    }
  | {
      type: 'update behaviors'
      behaviors: Array<Behavior>
    }
  | EditorEmittedEvent

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
      behaviors: Array<Behavior>
      keyGenerator: () => string
      pendingEvents: Array<PatchEvent | MutationEvent>
      schema: PortableTextMemberSchemaTypes
    },
    events: {} as EditorEvent,
    emitted: {} as EditorEmittedEvent,
    input: {} as {
      behaviors: Array<Behavior>
      keyGenerator: () => string
      schema: PortableTextMemberSchemaTypes
    },
  },
  actions: {
    'handle insert text': ({event}) => {
      assertEvent(event, 'insert text')
      Editor.insertText(event.editor, event.text)
    },
    'handle insert text block': ({context, event}) => {
      assertEvent(event, 'insert text block')
      Editor.insertNode(event.editor, {
        _key: context.keyGenerator(),
        _type: context.schema.block.name,
        style: context.schema.styles[0].value ?? 'normal',
        markDefs: [],
        children: [
          {
            _key: context.keyGenerator(),
            _type: 'span',
            text: '',
          },
        ],
      })
    },
    'handle:apply block style': ({event}) => {
      assertEvent(event, 'apply block style')
      for (const path of event.paths) {
        const at = toSlateRange(
          {anchor: {path, offset: 0}, focus: {path, offset: 0}},
          event.editor,
        )!

        Transforms.setNodes(
          event.editor,
          {
            style: event.style,
          },
          {
            at,
          },
        )
      }
    },
    'handle delete text': ({event}) => {
      assertEvent(event, 'delete text')
      Transforms.delete(event.editor, {
        at: toSlateRange(event.selection, event.editor)!,
      })
    },
    'assign schema': assign({
      schema: ({event}) => {
        assertEvent(event, 'update schema')
        return event.schema
      },
    }),
    'assign behaviors': assign({
      behaviors: ({event}) => {
        assertEvent(event, 'update behaviors')
        return event.behaviors
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
    'handle event': enqueueActions(({context, event, enqueue}) => {
      assertEvent(event, [
        'before:native:key down',
        'before:native:insert text',
        'before:insert text',
        'after:insert text',
      ])

      const eventBehaviors = context.behaviors.filter(
        (behavior) => behavior.on === event.type,
      )

      if (eventBehaviors.length === 0) {
        return
      }

      const value = fromSlateValue(
        event.editor.children,
        context.schema.block.name,
        KEY_TO_VALUE_ELEMENT.get(event.editor),
      )
      const selection = toPortableTextRange(
        value,
        event.editor.selection,
        context.schema,
      )

      if (!selection) {
        console.warn(
          `Unable to handle event ${event.type} due to missing selection`,
        )
        return
      }

      const behaviorContext = {
        schema: context.schema,
        value,
        selection,
      } satisfies BehaviorContext

      for (const eventBehavior of eventBehaviors) {
        const shouldRun =
          eventBehavior.guard?.({
            context: behaviorContext,
            event,
          }) ?? true

        if (!shouldRun) {
          continue
        }

        const actions = eventBehavior.actions.map((action) =>
          action({context: behaviorContext, event}, shouldRun),
        )

        for (const action of actions) {
          if (typeof action !== 'object') {
            continue
          }

          enqueue.raise(
            action.type === 'insert text'
              ? {
                  ...action,
                  type: action.type,
                  editor: event.editor,
                }
              : action.type === 'insert text block'
                ? {
                    ...action,
                    type: action.type,
                    editor: event.editor,
                  }
                : action.type === 'apply block style'
                  ? {
                      ...action,
                      type: action.type,
                      editor: event.editor,
                    }
                  : {
                      ...action,
                      type: action.type,
                      editor: event.editor,
                    },
          )
        }
      }
    }),
  },
  actors: {
    networkLogic,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: input.behaviors,
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    schema: input.schema,
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
    'update behaviors': {actions: ['assign behaviors']},
    'before:native:key down': {
      actions: ['handle event'],
    },
    'before:native:insert text': {
      actions: ['handle event'],
    },
    'before:insert text': {
      actions: ['handle event'],
    },
    'insert text': {
      actions: ['handle insert text'],
    },
    'after:insert text': {
      actions: ['handle event'],
    },
    'insert text block': {
      actions: ['handle insert text block'],
    },
    'apply block style': {
      actions: ['handle:apply block style'],
    },
    'delete text': {
      actions: ['handle delete text'],
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
