import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import type {ActorRef, EventObject, Snapshot} from 'xstate'
import type {Behavior} from '../behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from '../behaviors/behavior.types.event'
import {createCoreConverters} from '../converters/converters.core'
import {compileType} from '../internal-utils/schema'
import type {EditableAPI} from '../types/editor'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import type {
  EditorActor,
  EditorEmittedEvent,
  ExternalEditorEvent,
} from './editor-machine'
import {
  compileSchemaDefinitionToLegacySchema,
  legacySchemaToEditorSchema,
  type SchemaDefinition,
} from './editor-schema'
import {getEditorSnapshot} from './editor-selector'
import type {EditorSnapshot} from './editor-snapshot'
import {defaultKeyGenerator} from './key-generator'
import {createLegacySchema} from './legacy-schema'
import {createEditableAPI} from './plugins/createWithEditableAPI'

/**
 * @public
 */
export type EditorConfig = {
  /**
   * @beta
   */
  behaviors?: Array<Behavior>
  keyGenerator?: () => string
  /**
   * @deprecated Will be removed in the next major version
   */
  maxBlocks?: number
  readOnly?: boolean
  initialValue?: Array<PortableTextBlock>
} & (
  | {
      schemaDefinition: SchemaDefinition
      schema?: undefined
    }
  | {
      schemaDefinition?: undefined
      schema: ArraySchemaType<PortableTextBlock> | ArrayDefinition
    }
)

/**
 * @public
 */
export type EditorEvent = ExternalEditorEvent | ExternalBehaviorEvent

/**
 * @public
 */
export type Editor = {
  getSnapshot: () => EditorSnapshot
  /**
   * @beta
   */
  registerBehavior: (config: {behavior: Behavior}) => () => void
  send: (event: EditorEvent) => void
  on: ActorRef<Snapshot<unknown>, EventObject, EditorEmittedEvent>['on']
}

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
    behaviors: config.behaviors,
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

  return {
    getSnapshot: () =>
      getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: slateEditor.instance,
      }),
    registerBehavior: (config) => {
      editorActor.send({
        type: 'add behavior',
        behavior: config.behavior,
      })

      return () => {
        editorActor.send({
          type: 'remove behavior',
          behavior: config.behavior,
        })
      }
    },
    send: (event) => {
      switch (event.type) {
        case 'add behavior':
        case 'remove behavior':
        case 'update behaviors':
        case 'update key generator':
        case 'update readOnly':
        case 'patches':
        case 'update value':
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
