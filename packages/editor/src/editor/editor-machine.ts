import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
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
import type {NamespaceEvent, OmitFromUnion} from '../type-utils'
import type {
  EditorSelection,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {createEditorSnapshot} from './editor-snapshot'
import type {
  EditorEmittedEvent,
  MutationEvent,
  PatchEvent,
} from './relay-machine'

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
export type ExternalEditorEvent =
  | {
      type: 'update readOnly'
      readOnly: boolean
    }
  | {
      type: 'update maxBlocks'
      maxBlocks: number | undefined
    }
  | PatchesEvent

type InternalPatchEvent = NamespaceEvent<PatchEvent, 'internal'> & {
  operationId?: string
  value: Array<PortableTextBlock>
}

/**
 * @internal
 */
export type EditorActor = ActorRefFrom<typeof editorMachine>

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
      type: 'update selection'
      selection: EditorSelection
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
  | {
      type: 'set drag ghost'
      ghost: HTMLElement
    }
  | {
      type: 'dragstart'
      ghost?: HTMLElement
      origin: Pick<EventPosition, 'selection'>
    }
  | {type: 'dragend'}
  | {type: 'drop'}

/**
 * @internal
 */
export type InternalEditorEmittedEvent =
  | OmitFromUnion<EditorEmittedEvent, 'type', 'patch'>
  | InternalPatchEvent
  | PatchesEvent

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as {
      behaviors: Set<BehaviorConfig>
      behaviorsSorted: boolean
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
        origin: Pick<EventPosition, 'selection'>
      }
      dragGhost?: HTMLElement
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
      behaviorsSorted: false,
    }),
    'remove behavior from context': assign({
      behaviors: ({context, event}) => {
        assertEvent(event, 'remove behavior')

        context.behaviors.delete(event.behaviorConfig)

        return new Set([...context.behaviors])
      },
    }),
    'emit patch event': emit(({event}) => {
      assertEvent(event, 'internal.patch')
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
        assertEvent(event, ['internal.patch', 'mutation'])
        return [...context.pendingEvents, event]
      },
    }),
    'emit pending events': enqueueActions(({context, enqueue}) => {
      for (const event of context.pendingEvents) {
        enqueue.emit(event)
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
        const behaviors = [...context.behaviors.values()].map(
          (config) => config.behavior,
        )

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
            }),
          nativeEvent: event.nativeEvent,
          sendBack: (event) => self.send(event),
        })
      } catch (error) {
        console.error(
          new Error(
            `Raising "${event.behaviorEvent.type}" failed due to: ${error.message}`,
          ),
        )
      }
    },
    'sort behaviors': assign({
      behaviors: ({context}) =>
        !context.behaviorsSorted
          ? new Set(sortByPriority([...context.behaviors.values()]))
          : context.behaviors,
      behaviorsSorted: true,
    }),
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
    behaviors: new Set(coreBehaviorsConfig),
    behaviorsSorted: false,
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
    'add behavior': {actions: 'add behavior to context'},
    'remove behavior': {actions: 'remove behavior from context'},
    'update maxBlocks': {
      actions: assign({maxBlocks: ({event}) => event.maxBlocks}),
    },
    'update selection': {
      actions: [
        assign({selection: ({event}) => event.selection}),
        emit(({event}) => ({...event, type: 'selection'})),
      ],
    },
    'set drag ghost': {
      actions: assign({dragGhost: ({event}) => event.ghost}),
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
              actions: ['sort behaviors', 'handle behavior event'],
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
              actions: ['sort behaviors', 'handle behavior event'],
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
                  if (context.dragGhost) {
                    try {
                      context.dragGhost.parentNode?.removeChild(
                        context.dragGhost,
                      )
                    } catch (error) {
                      console.error(
                        new Error(
                          `Removing the drag ghost failed due to: ${error.message}`,
                        ),
                      )
                    }
                  }
                },
                assign({dragGhost: undefined}),
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
