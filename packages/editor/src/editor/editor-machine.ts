import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  setup,
  type ActorRefFrom,
} from 'xstate'
import {coreBehaviors} from '../behaviors/behavior.core'
import {defaultBehaviors} from '../behaviors/behavior.default'
import {performEvent} from '../behaviors/behavior.perform-event'
import type {Behavior} from '../behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import type {Converter} from '../converters/converter.types'
import type {EventPosition} from '../internal-utils/event-position'
import type {NamespaceEvent} from '../type-utils'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './define-schema'
import {createEditorSnapshot} from './editor-snapshot'

export * from 'xstate/guards'

/**
 * @public
 */
export type PatchesEvent = {
  type: 'patches'
  patches: Array<Patch>
  snapshot: Array<PortableTextBlock> | undefined
}

/**
 * @public
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
 * @public
 */
export type ExternalEditorEvent =
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
      type: 'update key generator'
      keyGenerator: () => string
    }
  | {
      type: 'update value'
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'update maxBlocks'
      maxBlocks: number | undefined
    }
  | PatchesEvent

/**
 * @public
 */
export type EditorEmittedEvent =
  | {
      type: 'blurred'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | {
      type: 'done loading'
    }
  | {
      type: 'editable'
    }
  | {
      type: 'error'
      name: string
      description: string
      data: unknown
    }
  | {
      type: 'focused'
      event: FocusEvent<HTMLDivElement, Element>
    }
  | {
      type: 'invalid value'
      resolution: InvalidValueResolution | null
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'loading'
    }
  | MutationEvent
  | PatchEvent
  | {
      type: 'read only'
    }
  | {
      type: 'ready'
    }
  | {
      type: 'selection'
      selection: EditorSelection
    }
  | {
      type: 'value changed'
      value: Array<PortableTextBlock> | undefined
    }

type PatchEvent = {
  type: 'patch'
  patch: Patch
}

type InternalPatchEvent = NamespaceEvent<PatchEvent, 'internal'> & {
  actionId?: string
  value: Array<PortableTextBlock>
}

type UnsetEvent = {
  type: 'unset'
  previousValue: Array<PortableTextBlock>
}

/**
 * @internal
 */
export type EditorActor = ActorRefFrom<typeof editorMachine>
export type HasTag = ReturnType<EditorActor['getSnapshot']>['hasTag']

/**
 * @internal
 */
export type InternalEditorEvent =
  | ExternalEditorEvent
  | {
      type: 'normalizing'
    }
  | {
      type: 'done normalizing'
    }
  | {
      type: 'done syncing initial value'
    }
  | {
      type: 'behavior event'
      behaviorEvent: BehaviorEvent
      editor: PortableTextSlateEditor
      defaultActionCallback?: () => void
      nativeEvent?: {preventDefault: () => void}
    }
  | MutationEvent
  | InternalPatchEvent
  | NamespaceEvent<EditorEmittedEvent, 'notify'>
  | NamespaceEvent<UnsetEvent, 'notify'>
  | {
      type: 'dragstart'
      origin: Pick<EventPosition, 'selection'>
      ghost?: HTMLElement
    }
  | {type: 'dragend'}
  | {type: 'drop'}

/**
 * @internal
 */
export type InternalEditorEmittedEvent =
  | EditorEmittedEvent
  | InternalPatchEvent
  | PatchesEvent
  | UnsetEvent

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as {
      behaviors: Set<Behavior>
      converters: Set<Converter>
      keyGenerator: () => string
      pendingEvents: Array<InternalPatchEvent | MutationEvent>
      schema: EditorSchema
      initialReadOnly: boolean
      maxBlocks: number | undefined
      selection: EditorSelection
      value: Array<PortableTextBlock> | undefined
      internalDrag?: {
        ghost?: HTMLElement
        origin: Pick<EventPosition, 'selection'>
      }
    },
    events: {} as InternalEditorEvent,
    emitted: {} as InternalEditorEmittedEvent,
    input: {} as {
      behaviors?: Array<Behavior>
      converters?: Array<Converter>
      keyGenerator: () => string
      maxBlocks?: number
      readOnly?: boolean
      schema: EditorSchema
      value?: Array<PortableTextBlock>
    },
    tags: {} as 'dragging internally',
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
        return new Set([...event.behaviors])
      },
    }),
    'assign schema': assign({
      schema: ({event}) => {
        assertEvent(event, 'update schema')
        return event.schema
      },
    }),
    'emit patch event': enqueueActions(({event, enqueue}) => {
      assertEvent(event, 'internal.patch')

      enqueue.emit(event)
      enqueue.emit({type: 'patch', patch: event.patch})
    }),
    'emit mutation event': emit(({event}) => {
      assertEvent(event, 'mutation')
      return event
    }),
    'emit read only': emit({type: 'read only'}),
    'emit editable': emit({type: 'editable'}),
    'defer event': assign({
      pendingEvents: ({context, event}) => {
        assertEvent(event, ['internal.patch', 'mutation'])
        return [...context.pendingEvents, event]
      },
    }),
    'emit pending events': enqueueActions(({context, enqueue}) => {
      for (const event of context.pendingEvents) {
        if (event.type === 'internal.patch') {
          enqueue.emit(event)
          enqueue.emit({type: 'patch', patch: event.patch})
        } else {
          enqueue.emit(event)
        }
      }
    }),
    'emit ready': emit({type: 'ready'}),
    'clear pending events': assign({
      pendingEvents: [],
    }),
    'handle behavior event': ({context, event, self}) => {
      assertEvent(event, ['behavior event'])

      performEvent({
        behaviors: [...context.behaviors.values(), ...defaultBehaviors],
        event: event.behaviorEvent,
        editor: event.editor,
        keyGenerator: context.keyGenerator,
        schema: context.schema,
        getSnapshot: () =>
          createEditorSnapshot({
            converters: [...context.converters],
            editor: event.editor,
            keyGenerator: context.keyGenerator,
            readOnly: self.getSnapshot().matches({'edit mode': 'read only'}),
            schema: context.schema,
            hasTag: (tag) => self.getSnapshot().hasTag(tag),
            internalDrag: context.internalDrag,
          }),
        nativeEvent: event.nativeEvent,
        defaultActionCallback:
          event.type === 'behavior event'
            ? event.defaultActionCallback
            : undefined,
      })
    },
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: new Set([...(input.behaviors ?? coreBehaviors)]),
    converters: new Set(input.converters ?? []),
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    schema: input.schema,
    selection: null,
    initialReadOnly: input.readOnly ?? false,
    maxBlocks: input.maxBlocks,
    value: input.value,
  }),
  on: {
    'notify.blurred': {
      actions: emit(({event}) => ({...event, type: 'blurred'})),
    },
    'notify.done loading': {actions: emit({type: 'done loading'})},
    'notify.error': {actions: emit(({event}) => ({...event, type: 'error'}))},
    'notify.invalid value': {
      actions: emit(({event}) => ({...event, type: 'invalid value'})),
    },
    'notify.focused': {
      actions: emit(({event}) => ({...event, type: 'focused'})),
    },
    'notify.selection': {
      actions: [
        assign({selection: ({event}) => event.selection}),
        emit(({event}) => ({...event, type: 'selection'})),
      ],
    },
    'notify.unset': {actions: emit(({event}) => ({...event, type: 'unset'}))},
    'notify.loading': {actions: emit({type: 'loading'})},
    'notify.value changed': {
      actions: emit(({event}) => ({...event, type: 'value changed'})),
    },

    'add behavior': {actions: 'add behavior to context'},
    'remove behavior': {actions: 'remove behavior from context'},
    'patches': {actions: emit(({event}) => event)},
    'update behaviors': {actions: 'assign behaviors'},
    'update key generator': {
      actions: assign({keyGenerator: ({event}) => event.keyGenerator}),
    },
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
          on: {
            'behavior event': {
              actions: 'handle behavior event',
              guard: ({event}) =>
                event.behaviorEvent.type === 'clipboard.copy' ||
                event.behaviorEvent.type === 'serialize' ||
                event.behaviorEvent.type === 'serialization.failure' ||
                event.behaviorEvent.type === 'serialization.success' ||
                event.behaviorEvent.type === 'select',
            },
          },
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
          },
          initial: 'idle',
          states: {
            'idle': {
              on: {
                dragstart: {
                  actions: [
                    assign({
                      internalDrag: ({event}) => ({
                        ghost: event.ghost,
                        origin: event.origin,
                      }),
                    }),
                  ],
                  target: 'dragging internally',
                },
              },
            },
            'dragging internally': {
              exit: [
                ({context}) => {
                  if (context.internalDrag?.ghost) {
                    try {
                      context.internalDrag.ghost.parentNode?.removeChild(
                        context.internalDrag.ghost,
                      )
                    } catch (error) {
                      console.error(
                        new Error(
                          `Removing the internal drag ghost failed due to: ${error.message}`,
                        ),
                      )
                    }
                  }
                },
                assign({internalDrag: undefined}),
              ],
              tags: ['dragging internally'],
              on: {
                dragend: {target: 'idle'},
                drop: {target: 'idle'},
              },
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
            'internal.patch': {
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
                'normalizing': {
                  target: 'normalizing',
                },
                'internal.patch': {
                  actions: 'defer event',
                  target: '#editor.setup.dirty',
                },
                'mutation': {
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
                'internal.patch': {
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
            'internal.patch': {
              actions: 'emit patch event',
            },
            'mutation': {
              actions: 'emit mutation event',
            },
          },
        },
      },
    },
  },
})
