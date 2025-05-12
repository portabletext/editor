import {createActor, type ActorRefFrom} from 'xstate'
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
import type {EditorActor} from './editor-machine'
import {
  compileSchemaDefinitionToLegacySchema,
  legacySchemaToEditorSchema,
} from './editor-schema'
import {getEditorSnapshot} from './editor-selector'
import {defaultKeyGenerator} from './key-generator'
import {createLegacySchema} from './legacy-schema'
import {mutationMachine} from './mutation-machine'
import {createEditableAPI} from './plugins/createWithEditableAPI'
import {syncMachine} from './sync-machine'

const debug = debugWithName('createInternalEditor')

export type InternalEditor = Editor & {
  _internal: {
    editable: EditableAPI
    editorActor: EditorActor
    slateEditor: SlateEditor
  }
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

export function editorConfigToMachineInput(config: EditorConfig) {
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

export function createInternalEditor(editorActor: EditorActor): InternalEditor {
  const slateEditor = createSlateEditor({editorActor})
  const editable = createEditableAPI(slateEditor.instance, editorActor)
  const {mutationActor, syncActor} = createActors({
    editorActor,
    slateEditor: slateEditor.instance,
  })

  mutationActor.start()
  syncActor.start()

  return {
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

        case 'update key generator':
        case 'update readOnly':
        case 'patches':
        case 'update schema':
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
      const subscription = editorActor.on(event, (event) => {
        switch (event.type) {
          case 'blurred':
          case 'done loading':
          case 'editable':
          case 'error':
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
  }
}

const actors = new WeakMap<
  EditorActor,
  {
    syncActor: ActorRefFrom<typeof syncMachine>
    mutationActor: ActorRefFrom<typeof mutationMachine>
  }
>()

function createActors(config: {
  editorActor: EditorActor
  slateEditor: PortableTextSlateEditor
}): {
  syncActor: ActorRefFrom<typeof syncMachine>
  mutationActor: ActorRefFrom<typeof mutationMachine>
} {
  const existingActor = actors.get(config.editorActor)

  if (existingActor) {
    debug('Reusing existing actors')
    return existingActor
  }

  debug('Creating new actors')

  const mutationActor = createActor(mutationMachine, {
    input: {
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

  mutationActor.on('*', (event) => {
    if (event.type === 'has pending patches') {
      syncActor.send({type: 'has pending patches'})
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
  })

  syncActor.on('*', (event) => {
    switch (event.type) {
      case 'invalid value':
        config.editorActor.send({
          ...event,
          type: 'notify.invalid value',
        })
        break
      case 'value changed':
        config.editorActor.send({
          ...event,
          type: 'notify.value changed',
        })
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

  config.editorActor.on('*', (event) => {
    if (event.type === 'read only') {
      syncActor.send({type: 'update readOnly', readOnly: true})
    }
    if (event.type === 'editable') {
      syncActor.send({type: 'update readOnly', readOnly: false})
    }
    if (event.type === 'internal.patch') {
      mutationActor.send({...event, type: 'patch'})
    }
  })

  actors.set(config.editorActor, {
    syncActor,
    mutationActor,
  })

  return {
    syncActor,
    mutationActor,
  }
}
