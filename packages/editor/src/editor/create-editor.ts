import {compileSchema} from '@portabletext/schema'
import {createActor} from 'xstate'
import {coreConverters} from '../converters/converters.core'
import type {Editor, EditorConfig} from '../editor'
import {subscribeToOperations} from '../engine/core/operation-channel'
import type {EngineOperation} from '../engine/interfaces/operation'
import {debug} from '../internal-utils/debug'
import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import type {EditableAPI} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {Operation} from '../types/operation'
import {defaultKeyGenerator} from '../utils/key-generator'
import {createEditableAPI} from './create-editable-api'
import {createEditorEngine} from './create-editor-engine'
import {createEditorDom} from './editor-dom'
import type {EditorActor} from './editor-machine'
import {editorMachine, rerouteExternalBehaviorEvent} from './editor-machine'
import {createMutationBatcher} from './mutation-batcher'
import {
  rangeDecorationsMachine,
  type RangeDecorationsActor,
} from './range-decorations-machine'
import {
  createRelay,
  type EditorEmittedEvent,
  type EditorEventListenerOptions,
  type Relay,
} from './relay'
import {subscribeCoalesced} from './subscribe-coalesced'
import {syncMachine, type SyncActor} from './sync-machine'

function assertUniqueRangeDecorationIds(rangeDecorations: Array<{id: string}>) {
  const seen = new Set<string>()

  for (const rangeDecoration of rangeDecorations) {
    if (seen.has(rangeDecoration.id)) {
      throw new Error(
        `\`registerRangeDecorations\` was given more than one range decoration with the id "${rangeDecoration.id}". Each range decoration must have a unique \`id\`.`,
      )
    }

    seen.add(rangeDecoration.id)
  }
}

export function createInternalEditor(config: EditorConfig): {
  actors: {
    editorActor: EditorActor
    rangeDecorationsActor: RangeDecorationsActor
    syncActor: SyncActor
  }
  relay: Relay
  editor: Editor
  editable: EditableAPI
  editorEngine: PortableTextEditorEngine
  subscriptions: Array<() => () => void>
} {
  debug.setup('creating new editor instance')

  const subscriptions: Array<() => () => void> = []
  const editorActor = createActor(editorMachine, {
    input: editorConfigToMachineInput(config),
  })
  const relay = createRelay()
  const editorEngine = createEditorEngine({
    editorActor,
    subscriptions,
  })
  const editable = createEditableAPI(editorEngine, editorActor)
  const rangeDecorationsActor = createActor(rangeDecorationsMachine, {
    input: {
      readOnly: Boolean(config.readOnly),
      schema: editorActor.getSnapshot().context.schema,
      editorEngine,
    },
  })
  const {syncActor} = createActors({
    editorActor,
    rangeDecorationsActor,
    relay,
    editorEngine,
    subscriptions,
  })

  let registeredRangeDecorationsCount = 0

  const editor: Editor = {
    dom: createEditorDom((event) => editorActor.send(event), editorEngine),
    getSnapshot: () => editorEngine.snapshot,
    registerBehavior: (behaviorConfig) => {
      const priority = createEditorPriority({
        name: 'custom',
        reference: {
          priority: corePriority,
          importance: 'higher',
        },
      })
      const behaviorConfigWithPriority = {
        ...behaviorConfig,
        priority,
      }

      editorActor.send({
        type: 'add behavior',
        behaviorConfig: behaviorConfigWithPriority,
      })

      return () => {
        editorActor.send({
          type: 'remove behavior',
          behaviorConfig: behaviorConfigWithPriority,
        })
      }
    },
    registerNode: (nodeConfig) => {
      editorActor.send({
        type: 'register',
        node: nodeConfig.node,
      })
      return () => {
        editorActor.send({
          type: 'unregister',
          node: nodeConfig.node,
        })
      }
    },
    registerRangeDecorations: (rangeDecorationsConfig) => {
      assertUniqueRangeDecorationIds(rangeDecorationsConfig.rangeDecorations)

      const sourceKey = `registered-range-decorations-${registeredRangeDecorationsCount++}`
      let unregistered = false

      rangeDecorationsActor.send({
        type: 'source updated',
        sourceKey,
        kind: 'registered',
        rangeDecorations: rangeDecorationsConfig.rangeDecorations,
        on: rangeDecorationsConfig.on,
      })

      return {
        update: (rangeDecorations) => {
          if (unregistered) {
            return
          }

          assertUniqueRangeDecorationIds(rangeDecorations)

          rangeDecorationsActor.send({
            type: 'source updated',
            sourceKey,
            kind: 'registered',
            rangeDecorations,
          })
        },
        unregister: () => {
          if (unregistered) {
            return
          }

          unregistered = true
          rangeDecorationsActor.send({type: 'source removed', sourceKey})
        },
      }
    },
    send: (event) => {
      switch (event.type) {
        case 'update value':
          syncActor.send(event)
          break

        case 'update readOnly':
        case 'patches':
          editorActor.send(event)
          break

        default:
          editorActor.send(
            rerouteExternalBehaviorEvent({
              event,
              editorEngine,
            }),
          )
      }
    },
    on: ((
      type: EditorEmittedEvent['type'] | '*',
      listener: (
        eventOrEvents: EditorEmittedEvent | Array<EditorEmittedEvent>,
      ) => void,
      options?: EditorEventListenerOptions,
    ) => {
      // Batched delivery hands the listener the whole coalesced burst as an
      // array. The per-event `switch` below applies only to unbatched (sync)
      // delivery; its sole filtering effect is dropping the deprecated
      // `'error'` event, which is no longer emitted, so batched and sync
      // delivery agree on every event type that actually occurs. A future
      // non-public `EditorEmittedEvent` type would need gating in both paths.
      if (options?.batch) {
        return relay.on(
          type,
          (events) => {
            listener(events)
          },
          {batch: true},
        )
      }

      return relay.on(type, (event) => {
        switch (event.type) {
          case 'blurred':
          case 'editable':
          case 'focused':
          case 'invalid value':
          case 'mutation':
          case 'operation':
          case 'patch':
          case 'read only':
          case 'ready':
          case 'selection':
          case 'value changed':
            listener(event)
            break
        }
      })
    }) as Editor['on'],
    subscribe(observer) {
      // Coalesce the actor's per-operation emissions to one settled-state
      // notification per microtask burst (see `subscribeCoalesced`). A single
      // action that applies many operations (undo of a large delete) then
      // notifies snapshot subscribers, e.g. `useEditorSelector`, once instead
      // of once per operation.
      return subscribeCoalesced(editorActor, {
        next: () => observer.next?.(editor.getSnapshot()),
        error: observer.error,
        complete: observer.complete,
      })
    },
  }

  return {
    actors: {
      editorActor,
      rangeDecorationsActor,
      syncActor,
    },
    relay,
    editor,
    editable,
    editorEngine,
    subscriptions,
  }
}

function editorConfigToMachineInput(config: EditorConfig) {
  const schema = compileSchema(config.schemaDefinition)

  return {
    converters: coreConverters,
    keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
    readOnly: config.readOnly,
    schema,
    initialValue: config.initialValue,
  } as const
}

/**
 * The public operation types. The `Record` keying makes completeness
 * compile-checked: adding a variant to the public `Operation` union in
 * `types/operation.ts` (which carries the tripwire that fires when the
 * engine vocabulary grows) errors here until the allowlist catches up.
 */
const publicOperationTypeRecord: Record<Operation['type'], true> = {
  'insert': true,
  'insert.text': true,
  'remove.text': true,
  'set': true,
  'unset': true,
}

const publicOperationTypes: ReadonlySet<string> = new Set(
  Object.keys(publicOperationTypeRecord),
)

function isPublicOperation(operation: EngineOperation): operation is Operation {
  return publicOperationTypes.has(operation.type)
}

function createActors(config: {
  editorActor: EditorActor
  rangeDecorationsActor: RangeDecorationsActor
  relay: Relay
  editorEngine: PortableTextEditorEngine
  subscriptions: Array<() => () => void>
}): {
  syncActor: SyncActor
} {
  debug.setup('creating new actors')

  const mutationBatcher = createMutationBatcher({
    editorActor: config.editorActor,
    editorEngine: config.editorEngine,
    relay: config.relay,
  })

  const syncActor = createActor(syncMachine, {
    input: {
      initialValue: config.editorActor.getSnapshot().context.initialValue,
      keyGenerator: config.editorActor.getSnapshot().context.keyGenerator,
      readOnly: config.editorActor
        .getSnapshot()
        .matches({'edit mode': 'read only'}),
      schema: config.editorActor.getSnapshot().context.schema,
      editorEngine: config.editorEngine,
    },
  })

  config.subscriptions.push(mutationBatcher.subscribe)

  config.subscriptions.push(() => {
    return subscribeToOperations(config.editorEngine, (event) => {
      if (!isPublicOperation(event.operation)) {
        // Allowlist, not blocklist: a new engine operation must be an
        // explicit decision to expose, both here and in the public
        // `Operation` type (which carries a compile-time tripwire for the
        // same purpose). `set.selection` stays excluded because selection
        // movements are the highest-frequency operation and the
        // `selection` event serves selection observers.
        return
      }

      config.relay.send({type: 'operation', operation: event.operation})
    })
  })

  config.subscriptions.push(() => {
    const subscription = syncActor.on('*', (event) => {
      switch (event.type) {
        case 'invalid value':
          config.relay.send(event)
          break
        case 'value changed':
          config.relay.send(event)
          break
        case 'patch':
          config.editorActor.send({
            ...event,
            type: 'internal.patch',
            value: config.editorEngine.snapshot.context.value,
          })
          break

        default:
          config.editorActor.send(event)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  config.subscriptions.push(() => {
    const subscription = config.editorActor.subscribe((snapshot) => {
      const readOnly = snapshot.matches({'edit mode': 'read only'})
      syncActor.send({type: 'update readOnly', readOnly})
      config.rangeDecorationsActor.send({type: 'update read only', readOnly})
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  config.subscriptions.push(() => {
    const subscription = config.editorActor.on('ready', () => {
      config.rangeDecorationsActor.send({type: 'ready'})
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  config.subscriptions.push(() => {
    const subscription = config.editorActor.on('*', (event) => {
      switch (event.type) {
        case 'editable':
        case 'mutation':
        case 'ready':
        case 'read only':
        case 'selection':
          config.relay.send(event)
          break
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return {
    syncActor,
  }
}
