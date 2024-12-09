import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Editor} from 'slate'
import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  setup,
  type ActorRefFrom,
} from 'xstate'
import {performAction} from '../behavior-actions/behavior.actions'
import {coreBehaviors} from '../behaviors/behavior.core'
import type {
  Behavior,
  BehaviorAction,
  BehaviorActionIntend,
  NativeBehaviorEvent,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextSlateEditor,
} from '../types/editor'
import debug from '../utils/debug'
import {toPortableTextRange} from '../utils/ranges'
import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {EditorSchema} from './define-schema'
import type {EditorContext} from './editor-snapshot'

export * from 'xstate/guards'

/**
 * @internal
 */
export type EditorActor = ActorRefFrom<typeof editorMachine>

/**
 * @internal
 */
export type PatchEvent = {type: 'patch'; patch: Patch}

/**
 * @internal
 */
export type PatchesEvent = {
  type: 'patches'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
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
export type InternalEditorEvent =
  | {type: 'normalizing'}
  | {type: 'done normalizing'}
  | {
      type: 'behavior event'
      behaviorEvent: SyntheticBehaviorEvent | NativeBehaviorEvent
      editor: PortableTextSlateEditor
      nativeEvent?: {preventDefault: () => void}
    }
  | {
      type: 'behavior action intends'
      editor: PortableTextSlateEditor
      actionIntends: Array<BehaviorActionIntend>
    }
  | {
      type: 'update schema'
      schema: EditorSchema
    }
  | {
      type: 'update behaviors'
      behaviors: Array<Behavior>
    }
  | {
      type: 'update value'
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'toggle readOnly'
    }
  | {
      type: 'update maxBlocks'
      maxBlocks: number | undefined
    }
  | OmitFromUnion<InternalEditorEmittedEvent, 'type', 'readOnly toggled'>

/**
 * @alpha
 */
export type EditorEmittedEvent = PickFromUnion<
  InternalEditorEmittedEvent,
  'type',
  | 'blurred'
  | 'done loading'
  | 'error'
  | 'focused'
  | 'invalid value'
  | 'loading'
  | 'mutation'
  | 'patch'
  | 'readOnly toggled'
  | 'ready'
  | 'selection'
  | 'value changed'
>

/**
 * @internal
 */
export type InternalEditorEmittedEvent =
  | {type: 'ready'}
  | PatchEvent
  | PatchesEvent
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
  | {type: 'blurred'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'focused'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'loading'}
  | {type: 'done loading'}
  | {type: 'readOnly toggled'; readOnly: boolean}
  | PickFromUnion<
      SyntheticBehaviorEvent,
      'type',
      | 'annotation.add'
      | 'annotation.remove'
      | 'annotation.toggle'
      | 'blur'
      | 'decorator.add'
      | 'decorator.remove'
      | 'decorator.toggle'
      | 'insert.block object'
      | 'insert.inline object'
      | 'list item.toggle'
      | 'focus'
      | 'style.toggle'
    >

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as {
      behaviors: Array<Behavior>
      keyGenerator: () => string
      pendingEvents: Array<PatchEvent | MutationEvent>
      schema: EditorSchema
      readOnly: boolean
      maxBlocks: number | undefined
      selection: EditorSelection
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as InternalEditorEvent,
    emitted: {} as InternalEditorEmittedEvent,
    input: {} as {
      behaviors?: Array<Behavior>
      keyGenerator: () => string
      maxBlocks?: number
      readOnly?: boolean
      schema: EditorSchema
      value?: Array<PortableTextBlock>
    },
  },
  actions: {
    'assign behaviors': assign({
      behaviors: ({event}) => {
        assertEvent(event, 'update behaviors')
        return event.behaviors
      },
    }),
    'assign schema': assign({
      schema: ({event}) => {
        assertEvent(event, 'update schema')
        return event.schema
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
    'handle behavior event': enqueueActions(({context, event, enqueue}) => {
      assertEvent(event, ['behavior event'])

      debug('Behavior event', event)

      const defaultAction =
        event.behaviorEvent.type === 'copy' ||
        event.behaviorEvent.type === 'key.down' ||
        event.behaviorEvent.type === 'key.up' ||
        event.behaviorEvent.type === 'paste'
          ? undefined
          : ({
              ...event.behaviorEvent,
              editor: event.editor,
            } satisfies BehaviorAction)

      const eventBehaviors = context.behaviors.filter(
        (behavior) => behavior.on === event.behaviorEvent.type,
      )

      if (eventBehaviors.length === 0) {
        if (!defaultAction) {
          return
        }

        enqueue.raise({
          type: 'behavior action intends',
          editor: event.editor,
          actionIntends: [defaultAction],
        })
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

      const editorContext = {
        keyGenerator: context.keyGenerator,
        schema: context.schema,
        selection,
        value,
      } satisfies EditorContext

      let behaviorOverwritten = false

      for (const eventBehavior of eventBehaviors) {
        const shouldRun =
          eventBehavior.guard === undefined ||
          eventBehavior.guard({
            context: editorContext,
            event: event.behaviorEvent,
          })

        if (!shouldRun) {
          continue
        }

        const actionIntendSets = eventBehavior.actions.map((actionSet) =>
          actionSet(
            {context: editorContext, event: event.behaviorEvent},
            shouldRun,
          ),
        )

        for (const actionIntends of actionIntendSets) {
          behaviorOverwritten =
            behaviorOverwritten ||
            (actionIntends.length > 0 &&
              actionIntends.some(
                (actionIntend) => actionIntend.type !== 'effect',
              ))

          enqueue.raise({
            type: 'behavior action intends',
            editor: event.editor,
            actionIntends,
          })
        }

        if (behaviorOverwritten) {
          event.nativeEvent?.preventDefault()
          break
        }
      }

      if (!behaviorOverwritten) {
        if (!defaultAction) {
          return
        }

        enqueue.raise({
          type: 'behavior action intends',
          editor: event.editor,
          actionIntends: [defaultAction],
        })
      }
    }),
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: input.behaviors ?? coreBehaviors,
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    schema: input.schema,
    selection: null,
    readOnly: input.readOnly ?? false,
    maxBlocks: input.maxBlocks,
    value: input.value,
  }),
  on: {
    'annotation.add': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'annotation.remove': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'annotation.toggle': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'blur': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'decorator.*': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'focus': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'insert.*': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'list item.*': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'style.*': {
      actions: emit(({event}) => event),
      guard: ({context}) => !context.readOnly,
    },
    'ready': {actions: emit(({event}) => event)},
    'unset': {actions: emit(({event}) => event)},
    'value changed': {actions: emit(({event}) => event)},
    'invalid value': {actions: emit(({event}) => event)},
    'error': {actions: emit(({event}) => event)},
    'selection': {
      actions: [
        assign({selection: ({event}) => event.selection}),
        emit(({event}) => event),
      ],
    },
    'blurred': {actions: emit(({event}) => event)},
    'focused': {actions: emit(({event}) => event)},
    'loading': {actions: emit({type: 'loading'})},
    'patches': {actions: emit(({event}) => event)},
    'done loading': {actions: emit({type: 'done loading'})},
    'update behaviors': {actions: 'assign behaviors'},
    'update schema': {actions: 'assign schema'},
    'update value': {actions: assign({value: ({event}) => event.value})},
    'toggle readOnly': {
      actions: [
        assign({readOnly: ({context}) => !context.readOnly}),
        emit(({context}) => ({
          type: 'readOnly toggled',
          readOnly: context.readOnly,
        })),
      ],
    },
    'update maxBlocks': {
      actions: assign({maxBlocks: ({event}) => event.maxBlocks}),
    },
    'behavior event': {
      actions: 'handle behavior event',
      guard: ({context}) => !context.readOnly,
    },
    'behavior action intends': {
      actions: [
        ({context, event}) => {
          Editor.withoutNormalizing(event.editor, () => {
            for (const actionIntend of event.actionIntends) {
              const action = {
                ...actionIntend,
                editor: event.editor,
              }

              performAction({context, action})
            }
          })
          event.editor.onChange()
        },
        enqueueActions(({context, event, enqueue}) => {
          if (
            event.actionIntends.some(
              (actionIntend) => actionIntend.type === 'reselect',
            )
          ) {
            enqueue.raise({
              type: 'selection',
              selection: toPortableTextRange(
                event.editor.children,
                event.editor.selection,
                context.schema,
              ),
            })
          }
        }),
      ],
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
