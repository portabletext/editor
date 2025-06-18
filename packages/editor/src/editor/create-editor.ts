import {createActor} from 'xstate'
import {createCoreConverters} from '../converters/converters.core'
import type {Editor, EditorConfig} from '../editor'
import {debugWithName} from '../internal-utils/debug'
import {compileType} from '../internal-utils/schema'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import type {EditableAPI, PortableTextSlateEditor} from '../types/editor'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import {createEditorDom} from './editor-dom'
import type {EditorActor} from './editor-machine'
import {editorMachine} from './editor-machine'
import {
  compileSchemaDefinitionToLegacySchema,
  legacySchemaToEditorSchema,
} from './editor-schema'
import {getEditorSnapshot} from './editor-selector'
import {defaultKeyGenerator} from './key-generator'
import {createLegacySchema} from './legacy-schema'
import {mutationMachine, type MutationActor} from './mutation-machine'
import {createEditableAPI} from './plugins/createWithEditableAPI'
import {relayMachine, type RelayActor} from './relay-machine'
import {syncMachine, type SyncActor} from './sync-machine'

const debug = debugWithName('setup')

export type InternalEditor = Editor & {
  _internal: {
    editable: EditableAPI
    editorActor: EditorActor
    slateEditor: SlateEditor
  }
}

export function createInternalEditor(config: EditorConfig): {
  actors: {
    editorActor: EditorActor
    mutationActor: MutationActor
    relayActor: RelayActor
    syncActor: SyncActor
  }
  editor: InternalEditor
  subscriptions: Array<() => () => void>
} {
  debug('Creating new Editor instance')

  const subscriptions: Array<() => () => void> = []
  const editorActor = createActor(editorMachine, {
    input: editorConfigToMachineInput(config),
  })
  const relayActor = createActor(relayMachine)
  const slateEditor = createSlateEditor({
    editorActor,
    relayActor,
    subscriptions,
  })
  const editable = createEditableAPI(slateEditor.instance, editorActor)
  const {mutationActor, syncActor} = createActors({
    editorActor,
    relayActor,
    slateEditor: slateEditor.instance,
    subscriptions,
  })

  const editor = {
    dom: createEditorDom(
      (event) => editorActor.send(event),
      slateEditor.instance,
    ),
    getSnapshot: () =>
      getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: slateEditor.instance,
      }),
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
    send: (event) => {
      switch (event.type) {
        case 'update value':
          syncActor.send(event)
          break

        case 'update readOnly':
        case 'patches':
        case 'update maxBlocks':
          editorActor.send(event)
          break

        case 'blur':
          editorActor.send({
            type: 'blur',
            editor: slateEditor.instance,
          })
          break

        case 'focus':
          editorActor.send({
            type: 'focus',
            editor: slateEditor.instance,
          })
          break

        case 'insert.block object':
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: {
              type: 'insert.block',
              block: {
                _type: event.blockObject.name,
                ...(event.blockObject.value ?? {}),
              },
              placement: event.placement,
            },
            editor: slateEditor.instance,
          })
          break

        default:
          editorActor.send({
            type: 'behavior event',
            behaviorEvent: event,
            editor: slateEditor.instance,
          })
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
    _internal: {
      editable,
      editorActor,
      slateEditor,
    },
  } satisfies InternalEditor

  return {
    actors: {
      editorActor,
      mutationActor,
      relayActor,
      syncActor,
    },
    editor,
    subscriptions,
  }
}

function editorConfigToMachineInput(config: EditorConfig) {
  const {legacySchema, schema} = compileSchemasFromEditorConfig(config)

  return {
    converters: createCoreConverters(legacySchema),
    getLegacySchema: () => legacySchema,
    keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
    maxBlocks: config.maxBlocks,
    readOnly: config.readOnly,
    schema,
    initialValue: config.initialValue,
  } as const
}

function compileSchemasFromEditorConfig(config: EditorConfig) {
  const legacySchema = config.schemaDefinition
    ? compileSchemaDefinitionToLegacySchema(config.schemaDefinition)
    : createLegacySchema(
        config.schema.hasOwnProperty('jsonType')
          ? config.schema
          : compileType(config.schema),
      )
  const schema = legacySchemaToEditorSchema(legacySchema)

  return {
    legacySchema,
    schema,
  }
}

function createActors(config: {
  editorActor: EditorActor
  relayActor: RelayActor
  slateEditor: PortableTextSlateEditor
  subscriptions: Array<() => () => void>
}): {
  mutationActor: MutationActor
  syncActor: SyncActor
} {
  debug('Creating new Actors')

  const mutationActor = createActor(mutationMachine, {
    input: {
      readOnly: config.editorActor
        .getSnapshot()
        .matches({'edit mode': 'read only'}),
      schema: config.editorActor.getSnapshot().context.schema,
      slateEditor: config.slateEditor,
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
      slateEditor: config.slateEditor,
    },
  })

  config.subscriptions.push(() => {
    const subscription = mutationActor.on('*', (event) => {
      if (event.type === 'has pending mutations') {
        syncActor.send({type: 'has pending mutations'})
      }
      if (event.type === 'mutation') {
        syncActor.send({type: 'mutation'})
        config.editorActor.send({
          type: 'mutation',
          patches: event.patches,
          snapshot: event.snapshot,
          value: event.snapshot,
        })
      }
      if (event.type === 'patch') {
        config.relayActor.send(event)
      }
    })

    return () => {
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
            value: fromSlateValue(
              config.slateEditor.children,
              config.editorActor.getSnapshot().context.schema.block.name,
              KEY_TO_VALUE_ELEMENT.get(config.slateEditor),
            ),
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
