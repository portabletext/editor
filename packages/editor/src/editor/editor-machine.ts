import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
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
import type {
  BehaviorEvent,
  ExternalBehaviorEvent,
} from '../behaviors/behavior.types.event'
import type {Converter} from '../converters/converter.types'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {normalize} from '../engine/editor/normalize'
import {debug} from '../internal-utils/debug'
import type {EventPosition} from '../internal-utils/event-position'
import {sortByPriority} from '../priority/priority.sort'
import type {RegistrableNode} from '../renderers/renderer.types'
import {pathContains} from '../traversal/path-contains'
import type {NamespaceEvent, OmitFromUnion} from '../type-utils'
import type {EditorSelection} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorSchema} from './editor-schema'
import {
  registerNodeOnEngine,
  unregisterNodeOnEngine,
} from './register-node-on-engine'
import type {EditorEmittedEvent, MutationEvent, PatchEvent} from './relay'

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
export type ExternalEditorEvent =
  | {
      type: 'update readOnly'
      readOnly: boolean
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
type InternalEditorEvent =
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
      editor: PortableTextEditorEngine
    }
  | {
      type: 'focus'
      editor: PortableTextEditorEngine
    }
  | {
      type: 'update selection'
      selection: EditorSelection
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
      editor: PortableTextEditorEngine
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
  | {
      type: 'register'
      node: RegistrableNode
    }
  | {
      type: 'unregister'
      node: RegistrableNode
    }
  | {type: 'add editor engine'; editor: PortableTextEditorEngine}

/**
 * @internal
 */
type InternalEditorEmittedEvent =
  | OmitFromUnion<EditorEmittedEvent, 'type', 'patch'>
  | InternalPatchEvent
  | PatchesEvent

export function rerouteExternalBehaviorEvent({
  event,
  editorEngine,
}: {
  event: ExternalBehaviorEvent
  editorEngine: PortableTextEditorEngine
}): InternalEditorEvent {
  switch (event.type) {
    case 'blur':
      return {
        type: 'blur',
        editor: editorEngine,
      }

    case 'focus':
      return {
        type: 'focus',
        editor: editorEngine,
      }

    case 'insert.block object':
      return {
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.block',
          block: {
            _type: event.blockObject.name,
            ...(event.blockObject.value ?? {}),
          },
          placement: event.placement,
        },
        editor: editorEngine,
      }

    default:
      return {
        type: 'behavior event',
        behaviorEvent: event,
        editor: editorEngine,
      }
  }
}

/**
 * @internal
 */
export const editorMachine = setup({
  types: {
    context: {} as {
      behaviors: Set<BehaviorConfig>
      behaviorsSorted: boolean
      initialConverters: Array<Converter>
      keyGenerator: () => string
      pendingEvents: Array<InternalPatchEvent | MutationEvent>
      pendingIncomingPatchesEvents: Array<PatchesEvent>
      pendingRegistrations: Array<RegistrableNode>
      schema: EditorSchema
      initialReadOnly: boolean
      initialValue: Array<PortableTextBlock> | undefined
      internalDrag?: {
        origin: Pick<EventPosition, 'selection'>
      }
      dragGhost?: HTMLElement
      editorEngine?: PortableTextEditorEngine
    },
    events: {} as InternalEditorEvent,
    emitted: {} as InternalEditorEmittedEvent,
    input: {} as {
      converters?: Array<Converter>
      keyGenerator: () => string
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
    'add editor engine to context': assign({
      editorEngine: ({context, event}) => {
        return event.type === 'add editor engine'
          ? event.editor
          : context.editorEngine
      },
    }),
    'register': ({context, event}) => {
      assertEvent(event, 'register')
      if (!context.editorEngine) {
        // Engine isn't attached yet (a child plugin's useEffect ran
        // before EditorProvider's). Buffer the registration; it will
        // be drained by `attach maps to editor engine` once the engine
        // is attached.
        context.pendingRegistrations.push(event.node)
        return
      }
      registerNodeOnEngine(context.editorEngine, event.node)
    },
    'unregister': ({context, event}) => {
      assertEvent(event, 'unregister')
      if (!context.editorEngine) {
        // Engine isn't attached yet; drop any matching pending
        // registration (cleanup path on unmount-before-attach).
        const index = context.pendingRegistrations.indexOf(event.node)
        if (index >= 0) {
          context.pendingRegistrations.splice(index, 1)
        }
        return
      }
      unregisterNodeOnEngine(context.editorEngine, event.node)
    },
    'attach maps to editor engine': ({context}) => {
      // After the editor engine is constructed, drain any registrations
      // that arrived from child components' useEffects (which fire
      // before EditorProvider's). Each drained registration mutates
      // the engine and triggers normalize+onChange.
      if (!context.editorEngine) {
        return
      }
      const engine = context.editorEngine
      for (const node of context.pendingRegistrations) {
        registerNodeOnEngine(engine, node)
      }
      context.pendingRegistrations.length = 0
      normalize(engine, {force: true})
      engine.onChange()
    },
    'emit patch event': emit(({event}) => {
      assertEvent(event, 'internal.patch')
      return event
    }),
    'emit mutation event': emit(({event}) => {
      assertEvent(event, 'mutation')
      return event
    }),
    'emit read only': enqueueActions(({context, enqueue}) => {
      if (context.editorEngine) {
        context.editorEngine.snapshot.context.readOnly = true
        context.editorEngine.onChange()
      }
      enqueue.emit({type: 'read only'})
    }),
    'emit editable': enqueueActions(({context, enqueue}) => {
      if (context.editorEngine) {
        context.editorEngine.snapshot.context.readOnly = false
        context.editorEngine.onChange()
      }
      enqueue.emit({type: 'editable'})
    }),
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
    'discard conflicting pending patches': assign({
      pendingEvents: ({context, event}) => {
        if (event.type !== 'patches') {
          return context.pendingEvents
        }

        const incomingPaths = event.patches.map((patch) => patch.path)

        return context.pendingEvents.filter((pendingEvent) => {
          if (pendingEvent.type !== 'internal.patch') {
            return true
          }

          return !incomingPaths.some(
            (incomingPath) =>
              pathContains(pendingEvent.patch.path, incomingPath) ||
              pathContains(incomingPath, pendingEvent.patch.path),
          )
        })
      },
    }),
    'discard all pending events': assign({
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
        DOMEditor.blur(event.editor)
      } catch (error) {
        console.error(
          new Error(
            `Failed to blur editor: ${error instanceof Error ? error.message : error}`,
          ),
        )
      }
    },
    'handle focus': ({context}) => {
      const editorEngine = context.editorEngine

      if (!editorEngine) {
        console.error('No editor engine found to focus')
        return
      }

      try {
        const currentSelection = editorEngine.snapshot.context.selection

        DOMEditor.focus(editorEngine)

        if (currentSelection) {
          editorEngine.select(currentSelection)

          // Tell the engine to use this selection for DOM sync
          editorEngine.pendingSelection =
            editorEngine.snapshot.context.selection

          // Trigger the DOM sync
          editorEngine.onChange()
        }
      } catch (error) {
        console.error(
          new Error(
            `Failed to focus editor: ${error instanceof Error ? error.message : error}`,
          ),
        )
      }
    },
    'handle behavior event': ({context, event, self}) => {
      assertEvent(event, ['behavior event'])

      try {
        const behaviors = [...context.behaviors.values()].map(
          (config) => config.behavior,
        )

        performEvent({
          mode: 'send',
          behaviors,
          remainingEventBehaviors: behaviors,
          event: event.behaviorEvent,
          editor: event.editor,
          converters: event.editor.snapshot.context.converters,
          keyGenerator: event.editor.snapshot.context.keyGenerator,
          schema: event.editor.snapshot.context.schema,
          readOnly: event.editor.snapshot.context.readOnly,
          nativeEvent: event.nativeEvent,
          sendBack: (eventSentBack) => {
            if (eventSentBack.type === 'set drag ghost') {
              self.send(eventSentBack)
              return
            }

            self.send(
              rerouteExternalBehaviorEvent({
                event: eventSentBack,
                editorEngine: event.editor,
              }),
            )
          },
        })
      } catch (error) {
        console.error(
          new Error(
            `Raising "${event.behaviorEvent.type}" failed due to: ${error instanceof Error ? error.message : error}`,
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
    'engine is busy': ({context}) => {
      if (!context.editorEngine) {
        return false
      }

      return context.editorEngine.operations.length > 0
    },
    'engine is normalizing node': ({context}) => {
      if (!context.editorEngine) {
        return false
      }

      return context.editorEngine.isNormalizingNode
    },
  },
}).createMachine({
  id: 'editor',
  context: ({input}) => ({
    behaviors: new Set(coreBehaviorsConfig),
    behaviorsSorted: false,
    initialConverters: input.converters ?? [],
    keyGenerator: input.keyGenerator,
    pendingEvents: [],
    pendingIncomingPatchesEvents: [],
    pendingRegistrations: [],
    schema: input.schema,
    initialReadOnly: input.readOnly ?? false,
    initialValue: input.initialValue,
  }),
  on: {
    'add behavior': {actions: 'add behavior to context'},
    'remove behavior': {actions: 'remove behavior from context'},
    'add editor engine': {
      actions: ['add editor engine to context', 'attach maps to editor engine'],
    },
    'register': {
      actions: ['register'],
    },
    'unregister': {
      actions: ['unregister'],
    },
    'update selection': {
      actions: [emit(({event}) => ({...event, type: 'selection'}))],
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
                  debug.state(
                    'entry: edit mode->read only->determine initial edit mode',
                  )
                },
              ],
              exit: [
                () => {
                  debug.state(
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
                  debug.state('entry: edit mode->read only->read only')
                },
              ],
              exit: [
                () => {
                  debug.state('exit: edit mode->read only->read only')
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
              actions: [assign({editorEngine: ({event}) => event.editor})],
            },
          },
          initial: 'idle',
          states: {
            'idle': {
              entry: [
                () => {
                  debug.state('entry: edit mode->editable->idle')
                },
              ],
              exit: [
                () => {
                  debug.state('exit: edit mode->editable-idle')
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
                      debug.state(
                        'entry: edit mode->editable->focusing->checking if busy',
                      )
                    },
                  ],
                  exit: [
                    () => {
                      debug.state(
                        'exit: edit mode->editable->focusing->checking if busy',
                      )
                    },
                  ],
                  always: [
                    {
                      guard: 'engine is busy',
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
                      debug.state('entry: edit mode->editable->focusing-busy')
                    },
                  ],
                  exit: [
                    () => {
                      debug.state('exit: edit mode->editable->focusing->busy')
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
                  debug.state('entry: edit mode->editable->dragging internally')
                },
              ],
              exit: [
                () => {
                  debug.state('exit: edit mode->editable->dragging internally')
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
                          `Removing the drag ghost failed due to: ${error instanceof Error ? error.message : error}`,
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
                dragstart: {
                  actions: [
                    assign({
                      internalDrag: ({event}) => ({
                        origin: event.origin,
                      }),
                    }),
                  ],
                },
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
              debug.state('entry: setup->setting up')
            },
          ],
          exit: [
            () => {
              debug.state('exit: setup->setting up')
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
                      debug.state('entry: setup->set up->value sync->idle')
                    },
                  ],
                  exit: [
                    () => {
                      debug.state('exit: setup->set up->value sync->idle')
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
                      debug.state(
                        'entry: setup->set up->value sync->syncing value',
                      )
                    },
                  ],
                  exit: [
                    () => {
                      debug.state(
                        'exit: setup->set up->value sync->syncing value',
                      )
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
                          debug.state(
                            'entry: setup->set up->writing->pristine->idle',
                          )
                        },
                      ],
                      exit: [
                        () => {
                          debug.state(
                            'exit: setup->set up->writing->pristine->idle',
                          )
                        },
                      ],
                      on: {
                        'internal.patch': [
                          {
                            guard: 'engine is normalizing node',
                            actions: 'defer event',
                          },
                          {
                            actions: 'defer event',
                            target: '#editor.setup.set up.writing.dirty',
                          },
                        ],
                        'mutation': [
                          {
                            guard: 'engine is normalizing node',
                            actions: 'defer event',
                          },
                          {
                            actions: 'defer event',
                            target: '#editor.setup.set up.writing.dirty',
                          },
                        ],
                        'patches': {
                          actions: 'discard conflicting pending patches',
                        },
                        'syncing value': {
                          actions: 'discard all pending events',
                        },
                      },
                    },
                  },
                },
                dirty: {
                  entry: [
                    () => {
                      debug.state('entry: setup->set up->writing->dirty')
                    },
                    'emit pending events',
                    'clear pending events',
                  ],
                  exit: [
                    () => {
                      debug.state('exit: setup->set up->writing->dirty')
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
