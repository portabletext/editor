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
  createRelay,
  type BufferedEditorEventListenerOptions,
  type EditorEmittedEvent,
  type EditorEventListenerOptions,
  type Relay,
} from './relay'
import {syncMachine, type SyncActor} from './sync-machine'

export function createInternalEditor(config: EditorConfig): {
  actors: {
    editorActor: EditorActor
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
  const {syncActor} = createActors({
    editorActor,
    relay,
    editorEngine,
    subscriptions,
  })

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
      options?: EditorEventListenerOptions & {buffer?: boolean},
    ) => {
      // Buffered microtask delivery hands the listener the whole burst as an
      // array; the per-event narrowing below does not apply.
      if (options?.buffer) {
        return relay.on(
          type,
          (events) => {
            listener(events)
          },
          options as BufferedEditorEventListenerOptions,
        )
      }

      return relay.on(
        type,
        (event) => {
          switch (event.type) {
            case 'blurred':
            case 'done loading':
            case 'editable':
            case 'focused':
            case 'invalid value':
            case 'loading':
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
        },
        options,
      )
    }) as Editor['on'],
    subscribe(observer) {
      const actorSubscription = editorActor.subscribe({
        next: () => observer.next?.(editor.getSnapshot()),
        error: observer.error,
        complete: observer.complete,
      })

      return {unsubscribe: () => actorSubscription.unsubscribe()}
    },
  }

  return {
    actors: {
      editorActor,
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
      if (snapshot.matches({'edit mode': 'read only'})) {
        syncActor.send({type: 'update readOnly', readOnly: true})
      } else {
        syncActor.send({type: 'update readOnly', readOnly: false})
      }
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
