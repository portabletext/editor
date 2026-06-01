import {compileSchema} from '@portabletext/schema'
import {createActor} from 'xstate'
import {coreConverters} from '../converters/converters.core'
import type {Editor, EditorConfig} from '../editor'
import {debug} from '../internal-utils/debug'
import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import type {EditableAPI} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {defaultKeyGenerator} from '../utils/key-generator'
import {createEditableAPI} from './create-editable-api'
import {createEditorEngine} from './create-editor-engine'
import {createEditorDom} from './editor-dom'
import type {EditorActor} from './editor-machine'
import {editorMachine, rerouteExternalBehaviorEvent} from './editor-machine'
import {mutationMachine, type MutationActor} from './mutation-machine'
import {relayMachine, type RelayActor} from './relay-machine'
import {syncMachine, type SyncActor} from './sync-machine'

export function createInternalEditor(config: EditorConfig): {
  actors: {
    editorActor: EditorActor
    mutationActor: MutationActor
    relayActor: RelayActor
    syncActor: SyncActor
  }
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
  const relayActor = createActor(relayMachine)
  const editorEngine = createEditorEngine({
    editorActor,
    relayActor,
    subscriptions,
  })
  const editable = createEditableAPI(editorEngine, editorActor)
  const {mutationActor, syncActor} = createActors({
    editorActor,
    relayActor,
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
    on: (event, listener) => {
      const subscription = relayActor.on(event, (event) => {
        switch (event.type) {
          case 'blurred':
          case 'done loading':
          case 'editable':
          case 'focused':
          case 'invalid value':
          case 'loading':
          case 'mutation':
          case 'patch':
          case 'read only':
          case 'ready':
          case 'selection':
          case 'value changed':
            listener(event)
            break
        }
      })

      return subscription
    },
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
      mutationActor,
      relayActor,
      syncActor,
    },
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

function createActors(config: {
  editorActor: EditorActor
  relayActor: RelayActor
  editorEngine: PortableTextEditorEngine
  subscriptions: Array<() => () => void>
}): {
  mutationActor: MutationActor
  syncActor: SyncActor
} {
  debug.setup('creating new actors')

  const mutationActor = createActor(mutationMachine, {
    input: {
      readOnly: config.editorActor
        .getSnapshot()
        .matches({'edit mode': 'read only'}),
      schema: config.editorActor.getSnapshot().context.schema,
      editorEngine: config.editorEngine,
    },
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

  config.subscriptions.push(() => {
    const subscription = mutationActor.on('*', (event) => {
      if (event.type === 'mutation') {
        config.editorActor.send({
          type: 'mutation',
          patches: event.patches,
          value: event.snapshot,
        })
      }
      if (event.type === 'patch') {
        config.relayActor.send(event)
      }
    })

    return () => {
      // Flushing pending patches and mutations before unmounting
      mutationActor.send({type: 'emit changes'})

      subscription.unsubscribe()
    }
  })

  config.subscriptions.push(() => {
    const subscription = syncActor.on('*', (event) => {
      switch (event.type) {
        case 'invalid value':
          config.relayActor.send(event)
          break
        case 'value changed':
          config.relayActor.send(event)
          break
        case 'patch':
          config.editorActor.send({
            ...event,
            type: 'internal.patch',
            value: config.editorEngine.children,
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
        mutationActor.send({type: 'update readOnly', readOnly: true})
        syncActor.send({type: 'update readOnly', readOnly: true})
      } else {
        mutationActor.send({type: 'update readOnly', readOnly: false})
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
          config.relayActor.send(event)
          break
        case 'internal.patch':
          mutationActor.send({...event, type: 'patch'})
          break
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return {
    mutationActor,
    syncActor,
  }
}
