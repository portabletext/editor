import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import type {FocusEvent} from 'react'
import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {
  assertEvent,
  assign,
  emit,
  enqueueActions,
  setup,
  type ActorRefFrom,
} from 'xstate'
import type {BehaviorConfig} from '../behaviors/behavior.config'
import {coreBehaviorsConfig} from '../behaviors/behavior.core'
import {performEvent} from '../behaviors/behavior.perform-event'
import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import type {Converter} from '../converters/converter.types'
import {debugWithName} from '../internal-utils/debug'
import type {EventPosition} from '../internal-utils/event-position'
import {sortByPriority} from '../priority/priority.sort'
import type {NamespaceEvent} from '../type-utils'
import type {
  EditorSelection,
  InvalidValueResolution,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {createEditorSnapshot} from './editor-snapshot'

export * from 'xstate/guards'

const debug = debugWithName('editor machine')

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
      type: 'update readOnly'
      readOnly: boolean
    }
  | {
      type: 'update schema'
      schema: EditorSchema
    }
  | {
      type: 'update key generator'
      keyGenerator: () => string
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
  operationId?: string
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
      type: 'add behavior'
      behaviorConfig: BehaviorConfig
    }
  | {
      type: 'remove behavior'
      behaviorConfig: BehaviorConfig
    }
  | {
      type: 'blur'
      editor: PortableTextSlateEditor
    }
  | {
      type: 'focus'
      editor: PortableTextSlateEditor
    }
  | {
      type: 'normalizing'
    }
  | {
      type: 'done normalizing'
    }
  | {
      type: 'done syncing value'
    }
  | {
      type: 'syncing value'
    }
  | {
      type: 'behavior event'
      behaviorEvent: BehaviorEvent
      editor: PortableTextSlateEditor
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
      behaviors: Set<BehaviorConfig>
      converters: Set<Converter>
      getLegacySchema: () => PortableTextMemberSchemaTypes
      keyGenerator: () => string
      pendingEvents: Array<InternalPatchEvent | MutationEvent>
      pendingIncomingPatchesEvents: Array<PatchesEvent>
      schema: EditorSchema
      initialReadOnly: boolean
      maxBlocks: number | undefined
      selection: EditorSelection
      initialValue: Array<PortableTextBlock> | undefined
      internalDrag?: {
        ghost?: HTMLElement
        origin: Pick<EventPosition, 'selection'>
      }
      slateEditor?: PortableTextSlateEditor
    },
    events: {} as InternalEditorEvent,
    emitted: {} as InternalEditorEmittedEvent,
    input: {} as {
      converters?: Array<Converter>
      getLegacySchema: () => PortableTextMemberSchemaTypes
      keyGenerator: () => string
      maxBlocks?: number
      readOnly?: boolean
      schema: EditorSchema
      initialValue?: Array<PortableTextBlock>
    },
    tags: {} as 'dragging internally',
  },
  actions: {
    'add behavior to context': assign({
      behaviors: ({context, event}) => {
        assertEvent(event, 'add behavior')

        return new Set([...context.behaviors, event.behaviorConfig])
      },
    }),
    'remove behavior from context': assign({
      behaviors: ({context, event}) => {
        assertEvent(event, 'remove behavior')

        context.behaviors.delete(event.behaviorConfig)

        return new Set([...context.behaviors])
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
    'defer incoming patches': assign({
      pendingIncomingPatchesEvents: ({context, event}) => {
        return event.type === 'patches'
          ? [...context.pendingIncomingPatchesEvents, event]
          : context.pendingIncomingPatchesEvents
      },
    }),
    'emit pending incoming patches': enqueueActions(({context, enqueue}) => {
      for (const event of context.pendingIncomingPatchesEvents) {
        enqueue.emit(event)
      }
    }),
    'clear pending incoming patches': assign({
      pendingIncomingPatchesEvents: [],
    }),
    'handle blur': ({event}) => {
      assertEvent(event, 'blur')

      try {
        ReactEditor.blur(event.editor)
      } catch (error) {
        console.error(new Error(`Failed to blur editor: ${error.message}`))
      }
    },
    'handle focus': ({context}) => {
      if (!context.slateEditor) {
        console.error('No Slate editor found to focus')
        return
      }

      try {
        const currentSelection = context.slateEditor.selection
        ReactEditor.focus(context.slateEditor)
        if (currentSelection) {
          Transforms.select(context.slateEditor, currentSelection)
        }
      } catch (error) {
        console.error(new Error(`Failed to focus editor: ${error.message}`))
      }
    },
    'handle behavior event': ({context, event, self}) => {
      assertEvent(event, ['behavior event'])

      try {
        const behaviors = sortByPriority([
          ...context.behaviors.values(),
          ...coreBehaviorsConfig,
        ]).map((config) => config.behavior)

        performEvent({
          mode: 'raise',
          behaviors,
          remainingEventBehaviors: behaviors,
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
        })
      } catch (error) {
        console.error(
          new Error(
            `Raising "${event.behaviorEvent.type}" failed due to: ${error.message}`,
          ),
        )
      }
    },
  },
  guards: {
    'slate is busy': ({context}) => {
      if (!context.slateEditor) {
        return false
      }

      return context.slateEditor.operations.length > 0
    },
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: new Set([]),
    converters: new Set(input.converters ?? []),
    getLegacySchema: input.getLegacySchema,
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    pendingIncomingPatchesEvents: [],
    schema: input.schema,
    selection: null,
    initialReadOnly: input.readOnly ?? false,
    maxBlocks: input.maxBlocks,
    initialValue: input.initialValue,
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
    'update key generator': {
      actions: assign({keyGenerator: ({event}) => event.keyGenerator}),
    },
    'update schema': {actions: 'assign schema'},
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
                event.behaviorEvent.type === 'mouse.click' ||
                event.behaviorEvent.type === 'serialize' ||
                event.behaviorEvent.type === 'serialization.failure' ||
                event.behaviorEvent.type === 'serialization.success' ||
                event.behaviorEvent.type === 'select',
            },
          },
          states: {
            'determine initial edit mode': {
              entry: [
                () => {
                  debug(
                    'entry: edit mode->read only->determine initial edit mode',
                  )
                },
              ],
              exit: [
                () => {
                  debug(
                    'exit: edit mode->read only->determine initial edit mode',
                  )
                },
              ],
              on: {
                'done syncing value': [
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
              entry: [
                () => {
                  debug('entry: edit mode->read only->read only')
                },
              ],
              exit: [
                () => {
                  debug('exit: edit mode->read only->read only')
                },
              ],
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
            'blur': {
              actions: 'handle blur',
            },
            'focus': {
              target: '.focusing',
              actions: [assign({slateEditor: ({event}) => event.editor})],
            },
          },
          initial: 'idle',
          states: {
            'idle': {
              entry: [
                () => {
                  debug('entry: edit mode->editable->idle')
                },
              ],
              exit: [
                () => {
                  debug('exit: edit mode->editable-idle')
                },
              ],
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
            'focusing': {
              initial: 'checking if busy',
              states: {
                'checking if busy': {
                  entry: [
                    () => {
                      debug(
                        'entry: edit mode->editable->focusing->checking if busy',
                      )
                    },
                  ],
                  exit: [
                    () => {
                      debug(
                        'exit: edit mode->editable->focusing->checking if busy',
                      )
                    },
                  ],
                  always: [
                    {
                      guard: 'slate is busy',
                      target: 'busy',
                    },
                    {
                      target: '#editor.edit mode.editable.idle',
                      actions: ['handle focus'],
                    },
                  ],
                },
                'busy': {
                  entry: [
                    () => {
                      debug('entry: edit mode->editable->focusing-busy')
                    },
                  ],
                  exit: [
                    () => {
                      debug('exit: edit mode->editable->focusing->busy')
                    },
                  ],
                  after: {
                    10: {
                      target: 'checking if busy',
                    },
                  },
                },
              },
            },
            'dragging internally': {
              entry: [
                () => {
                  debug('entry: edit mode->editable->dragging internally')
                },
              ],
              exit: [
                () => {
                  debug('exit: edit mode->editable->dragging internally')
                },
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
          entry: [
            () => {
              debug('entry: setup->setting up')
            },
          ],
          exit: [
            () => {
              debug('exit: setup->setting up')
            },
            'emit ready',
            'emit pending incoming patches',
            'clear pending incoming patches',
          ],
          on: {
            'internal.patch': {
              actions: 'defer event',
            },
            'mutation': {
              actions: 'defer event',
            },
            'done syncing value': {
              target: 'set up',
            },
            'patches': {
              actions: ['defer incoming patches'],
            },
          },
        },
        'set up': {
          type: 'parallel',
          states: {
            'value sync': {
              initial: 'idle',
              states: {
                'idle': {
                  entry: [
                    () => {
                      debug('entry: setup->set up->value sync->idle')
                    },
                  ],
                  exit: [
                    () => {
                      debug('exit: setup->set up->value sync->idle')
                    },
                  ],
                  on: {
                    'patches': {
                      actions: [emit(({event}) => event)],
                    },
                    'syncing value': {
                      target: 'syncing value',
                    },
                  },
                },
                'syncing value': {
                  entry: [
                    () => {
                      debug('entry: setup->set up->value sync->syncing value')
                    },
                  ],
                  exit: [
                    () => {
                      debug('exit: setup->set up->value sync->syncing value')
                    },
                    'emit pending incoming patches',
                    'clear pending incoming patches',
                  ],
                  on: {
                    'patches': {
                      actions: ['defer incoming patches'],
                    },
                    'done syncing value': {
                      target: 'idle',
                    },
                  },
                },
              },
            },
            'writing': {
              initial: 'pristine',
              states: {
                pristine: {
                  initial: 'idle',
                  states: {
                    idle: {
                      entry: [
                        () => {
                          debug('entry: setup->set up->writing->pristine->idle')
                        },
                      ],
                      exit: [
                        () => {
                          debug('exit: setup->set up->writing->pristine->idle')
                        },
                      ],
                      on: {
                        'normalizing': {
                          target: 'normalizing',
                        },
                        'internal.patch': {
                          actions: 'defer event',
                          target: '#editor.setup.set up.writing.dirty',
                        },
                        'mutation': {
                          actions: 'defer event',
                          target: '#editor.setup.set up.writing.dirty',
                        },
                      },
                    },
                    normalizing: {
                      entry: [
                        () => {
                          debug(
                            'entry: setup->set up->writing->pristine->normalizing',
                          )
                        },
                      ],
                      exit: [
                        () => {
                          debug(
                            'exit: setup->set up->writing->pristine->normalizing',
                          )
                        },
                      ],
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
                dirty: {
                  entry: [
                    () => {
                      debug('entry: setup->set up->writing->dirty')
                    },
                    'emit pending events',
                    'clear pending events',
                  ],
                  exit: [
                    () => {
                      debug('exit: setup->set up->writing->dirty')
                    },
                  ],
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
        },
      },
    },
  },
})
