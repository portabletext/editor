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
import {
  isCustomBehaviorEvent,
  type Behavior,
  type BehaviorAction,
  type CustomBehaviorEvent,
  type NativeBehaviorEvent,
  type SyntheticBehaviorEvent,
} from '../behaviors/behavior.types'
import {toPortableTextRange} from '../internal-utils/ranges'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './define-schema'
import type {EditorContext} from './editor-snapshot'
import {getActiveDecorators} from './get-active-decorators'
import {withApplyingBehaviorActions} from './with-applying-behavior-actions'

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
  /**
   * @deprecated Use `value` instead
   */
  snapshot: Array<PortableTextBlock> | undefined
  value: Array<PortableTextBlock> | undefined
}

/**
 * @internal
 */
export type InternalEditorEvent =
  | {type: 'normalizing'}
  | {type: 'done normalizing'}
  | {type: 'done syncing initial value'}
  | {
      type: 'behavior event'
      behaviorEvent: SyntheticBehaviorEvent | NativeBehaviorEvent
      editor: PortableTextSlateEditor
      defaultActionCallback?: () => void
      nativeEvent?: {preventDefault: () => void}
    }
  | {
      type: 'custom behavior event'
      behaviorEvent: CustomBehaviorEvent
      editor: PortableTextSlateEditor
      nativeEvent?: {preventDefault: () => void}
    }
  | CustomBehaviorEvent
  | {
      type: 'add behavior'
      behavior: Behavior
    }
  | {
      type: 'remove behavior'
      behavior: Behavior
    }
  | {
      type: 'update readOnly'
      readOnly: boolean
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
      type: 'update maxBlocks'
      maxBlocks: number | undefined
    }
  | OmitFromUnion<
      InternalEditorEmittedEvent,
      'type',
      'ready' | 'read only' | 'editable'
    >

/**
 * @public
 */
export type EditorEmittedEvent = PickFromUnion<
  InternalEditorEmittedEvent,
  'type',
  | 'blurred'
  | 'done loading'
  | 'editable'
  | 'error'
  | 'focused'
  | 'invalid value'
  | 'loading'
  | 'mutation'
  | 'patch'
  | 'read only'
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
  | {type: 'select'; selection: EditorSelection}
  | {type: 'selection'; selection: EditorSelection}
  | {type: 'blurred'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'focused'; event: FocusEvent<HTMLDivElement, Element>}
  | {type: 'loading'}
  | {type: 'done loading'}
  | {type: 'read only'}
  | {type: 'editable'}
  | PickFromUnion<
      SyntheticBehaviorEvent,
      'type',
      | 'annotation.add'
      | 'annotation.remove'
      | 'blur'
      | 'decorator.toggle'
      | 'insert.block object'
      | 'insert.inline object'
      | 'list item.toggle'
      | 'focus'
      | 'style.toggle'
    >
  | {
      type: 'custom.*'
      event: CustomBehaviorEvent
    }

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as {
      behaviors: Set<Behavior>
      keyGenerator: () => string
      pendingEvents: Array<PatchEvent | MutationEvent>
      schema: EditorSchema
      initialReadOnly: boolean
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
    'add behavior to context': assign({
      behaviors: ({context, event}) => {
        assertEvent(event, 'add behavior')

        return new Set([...context.behaviors, event.behavior])
      },
    }),
    'remove behavior from context': assign({
      behaviors: ({context, event}) => {
        assertEvent(event, 'remove behavior')

        context.behaviors.delete(event.behavior)

        return new Set([...context.behaviors])
      },
    }),
    'assign behaviors': assign({
      behaviors: ({event}) => {
        assertEvent(event, 'update behaviors')
        return new Set(event.behaviors)
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
    'emit read only': emit({type: 'read only'}),
    'emit editable': emit({type: 'editable'}),
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
    'emit ready': emit({type: 'ready'}),
    'clear pending events': assign({
      pendingEvents: [],
    }),
    'handle behavior event': enqueueActions(({context, event, enqueue}) => {
      assertEvent(event, ['behavior event', 'custom behavior event'])

      const defaultAction =
        event.type === 'custom behavior event' ||
        event.behaviorEvent.type === 'copy' ||
        event.behaviorEvent.type === 'key.down' ||
        event.behaviorEvent.type === 'key.up' ||
        event.behaviorEvent.type === 'paste'
          ? undefined
          : ({
              ...event.behaviorEvent,
              editor: event.editor,
            } satisfies BehaviorAction)
      const defaultActionCallback =
        event.type === 'behavior event'
          ? event.defaultActionCallback
          : undefined

      const eventBehaviors = [...context.behaviors.values()].filter(
        (behavior) => behavior.on === event.behaviorEvent.type,
      )

      if (eventBehaviors.length === 0) {
        if (defaultActionCallback) {
          withApplyingBehaviorActions(event.editor, () => {
            Editor.withoutNormalizing(event.editor, () => {
              defaultActionCallback()
            })
          })
          return
        }

        if (!defaultAction) {
          return
        }

        withApplyingBehaviorActions(event.editor, () => {
          Editor.withoutNormalizing(event.editor, () => {
            performAction({
              context,
              action: defaultAction,
            })
          })
        })
        event.editor.onChange()
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
        activeDecorators: getActiveDecorators({
          schema: context.schema,
          slateEditorInstance: event.editor,
        }),
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

          withApplyingBehaviorActions(event.editor, () => {
            Editor.withoutNormalizing(event.editor, () => {
              for (const actionIntend of actionIntends) {
                if (actionIntend.type === 'raise') {
                  if (isCustomBehaviorEvent(actionIntend.event)) {
                    enqueue.raise({
                      type: 'custom behavior event',
                      behaviorEvent: actionIntend.event as CustomBehaviorEvent,
                      editor: event.editor,
                    })
                  } else {
                    enqueue.raise({
                      type: 'behavior event',
                      behaviorEvent: actionIntend.event,
                      editor: event.editor,
                    })
                  }
                  continue
                }

                const action = {
                  ...actionIntend,
                  editor: event.editor,
                }

                performAction({context, action})
              }
            })
          })
          event.editor.onChange()
        }

        if (behaviorOverwritten) {
          event.nativeEvent?.preventDefault()
          break
        }
      }

      if (!behaviorOverwritten) {
        if (defaultActionCallback) {
          withApplyingBehaviorActions(event.editor, () => {
            Editor.withoutNormalizing(event.editor, () => {
              defaultActionCallback()
            })
          })
          return
        }

        if (!defaultAction) {
          return
        }

        withApplyingBehaviorActions(event.editor, () => {
          Editor.withoutNormalizing(event.editor, () => {
            performAction({
              context,
              action: defaultAction,
            })
          })
        })
        event.editor.onChange()
      }
    }),
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: new Set(input.behaviors ?? coreBehaviors),
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    schema: input.schema,
    selection: null,
    initialReadOnly: input.readOnly ?? false,
    maxBlocks: input.maxBlocks,
    value: input.value,
  }),
  on: {
    'add behavior': {actions: 'add behavior to context'},
    'remove behavior': {actions: 'remove behavior from context'},
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
    'update maxBlocks': {
      actions: assign({maxBlocks: ({event}) => event.maxBlocks}),
    },
  },
  type: 'parallel',
  states: {
    'edit mode': {
      initial: 'read only',
      states: {
        'read only': {
          initial: 'determine initial edit mode',
          states: {
            'determine initial edit mode': {
              on: {
                'done syncing initial value': [
                  {
                    target: '#editor.edit mode.read only.read only',
                    guard: ({context}) => context.initialReadOnly,
                  },
                  {
                    target: '#editor.edit mode.editable',
                  },
                ],
              },
            },
            'read only': {
              on: {
                'update readOnly': {
                  guard: ({event}) => !event.readOnly,
                  target: '#editor.edit mode.editable',
                  actions: ['emit editable'],
                },
              },
            },
          },
        },
        'editable': {
          on: {
            'update readOnly': {
              guard: ({event}) => event.readOnly,
              target: '#editor.edit mode.read only.read only',
              actions: ['emit read only'],
            },
            'behavior event': {
              actions: 'handle behavior event',
            },
            'custom behavior event': {
              actions: 'handle behavior event',
            },
            'annotation.*': {
              actions: emit(({event}) => event),
            },
            'blur': {
              actions: emit(({event}) => event),
            },
            'custom.*': {
              actions: emit(({event}) => ({type: 'custom.*', event})),
            },
            'decorator.*': {
              actions: emit(({event}) => event),
            },
            'focus': {
              actions: emit(({event}) => event),
            },
            'insert.*': {
              actions: emit(({event}) => event),
            },
            'list item.*': {
              actions: emit(({event}) => event),
            },
            'select': {
              actions: emit(({event}) => event),
            },
            'style.*': {
              actions: emit(({event}) => event),
            },
          },
        },
      },
    },
    'setup': {
      initial: 'setting up',
      states: {
        'setting up': {
          exit: ['emit ready'],
          on: {
            'patch': {
              actions: 'defer event',
            },
            'mutation': {
              actions: 'defer event',
            },
            'done syncing initial value': {
              target: 'pristine',
            },
          },
        },
        'pristine': {
          initial: 'idle',
          states: {
            idle: {
              on: {
                normalizing: {
                  target: 'normalizing',
                },
                patch: {
                  actions: 'defer event',
                  target: '#editor.setup.dirty',
                },
                mutation: {
                  actions: 'defer event',
                  target: '#editor.setup.dirty',
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
        'dirty': {
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
    },
  },
})
