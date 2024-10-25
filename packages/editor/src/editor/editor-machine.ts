import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Editor} from 'slate'
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
import {toPortableTextRange} from '../utils/ranges'
import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import {performAction, performDefaultAction} from './behavior/behavior.actions'
import {coreBehaviors} from './behavior/behavior.core'
import type {
  Behavior,
  BehaviorAction,
  BehaviorActionIntend,
  BehaviorContext,
  BehaviorEvent,
} from './behavior/behavior.types'

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

type EditorEvent =
  | {type: 'normalizing'}
  | {type: 'done normalizing'}
  | {
      type: 'behavior event'
      behaviorEvent: BehaviorEvent
      editor: PortableTextSlateEditor
    }
  | {
      type: 'behavior action intends'
      editor: PortableTextSlateEditor
      actionIntends: Array<BehaviorActionIntend>
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
      behaviors?: Array<Behavior>
      keyGenerator: () => string
      schema: PortableTextMemberSchemaTypes
    },
  },
  actions: {
    'assign behaviors': assign({
      behaviors: ({event}) => {
        assertEvent(event, 'update behaviors')
        return [...coreBehaviors, ...event.behaviors]
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

      const defaultAction = {
        ...event.behaviorEvent,
        editor: event.editor,
      } satisfies BehaviorAction

      const eventBehaviors = context.behaviors.filter(
        (behavior) => behavior.on === event.behaviorEvent.type,
      )

      if (eventBehaviors.length === 0) {
        performDefaultAction({context, action: defaultAction})
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
        performDefaultAction({context, action: defaultAction})
        return
      }

      const behaviorContext = {
        schema: context.schema,
        value,
        selection,
      } satisfies BehaviorContext

      let behaviorOverwritten = false

      for (const eventBehavior of eventBehaviors) {
        const shouldRun =
          eventBehavior.guard?.({
            context: behaviorContext,
            event: event.behaviorEvent,
          }) ?? true

        if (!shouldRun) {
          continue
        }

        const actionIntendSets = eventBehavior.actions.map((actionSet) =>
          actionSet(
            {context: behaviorContext, event: event.behaviorEvent},
            shouldRun,
          ),
        )

        for (const actionIntends of actionIntendSets) {
          behaviorOverwritten =
            actionIntends.length > 0 &&
            actionIntends.some((actionIntend) => actionIntend.type !== 'effect')

          enqueue.raise({
            type: 'behavior action intends',
            editor: event.editor,
            actionIntends,
          })
        }

        if (behaviorOverwritten) {
          break
        }
      }

      if (!behaviorOverwritten) {
        performDefaultAction({context, action: defaultAction})
      }
    }),
  },
  actors: {
    networkLogic,
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: input.behaviors
      ? [...coreBehaviors, ...input.behaviors]
      : coreBehaviors,
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
    'patches': {actions: emit(({event}) => event)},
    'done loading': {actions: emit({type: 'done loading'})},
    'update behaviors': {actions: 'assign behaviors'},
    'update schema': {actions: 'assign schema'},
    'behavior event': {actions: 'handle behavior event'},
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
