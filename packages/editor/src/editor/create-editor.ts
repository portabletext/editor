import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import {useActorRef} from '@xstate/react'
import {useMemo} from 'react'
import {
  createActor,
  type ActorRef,
  type EventObject,
  type Snapshot,
} from 'xstate'
import type {Behavior, CustomBehaviorEvent} from '../behaviors/behavior.types'
import {compileType} from '../internal-utils/schema'
import type {PickFromUnion} from '../type-utils'
import type {EditableAPI} from '../types/editor'
import {createEditorSchema} from './create-editor-schema'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import {compileSchemaDefinition, type SchemaDefinition} from './define-schema'
import {
  editorMachine,
  type EditorActor,
  type EditorEmittedEvent,
  type InternalEditorEvent,
} from './editor-machine'
import {getEditorSnapshot} from './editor-selector'
import type {EditorSnapshot} from './editor-snapshot'
import {defaultKeyGenerator} from './key-generator'
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
export type EditorEvent =
  | PickFromUnion<
      InternalEditorEvent,
      'type',
      | 'annotation.add'
      | 'annotation.remove'
      | 'blur'
      | 'decorator.toggle'
      | 'focus'
      | 'insert.block object'
      | 'insert.inline object'
      | 'list item.toggle'
      | 'select'
      | 'style.toggle'
      | 'patches'
      | 'update behaviors'
      | 'update readOnly'
      | 'update value'
    >
  | CustomBehaviorEvent

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
  _internal: {
    editable: EditableAPI
    editorActor: EditorActor
    slateEditor: SlateEditor
  }
}

export function createEditor(config: EditorConfig): Editor {
  const editorActor = createActor(editorMachine, {
    input: editorConfigToMachineInput(config),
  })
  editorActor.start()

  return createEditorFromActor(editorActor)
}

export function useCreateEditor(config: EditorConfig): Editor {
  const editorActor = useActorRef(editorMachine, {
    input: editorConfigToMachineInput(config),
  })

  return useMemo(() => createEditorFromActor(editorActor), [editorActor])
}

function editorConfigToMachineInput(config: EditorConfig) {
  return {
    behaviors: config.behaviors,
    keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
    maxBlocks: config.maxBlocks,
    readOnly: config.readOnly,
    schema: config.schemaDefinition
      ? compileSchemaDefinition(config.schemaDefinition)
      : createEditorSchema(
          config.schema.hasOwnProperty('jsonType')
            ? config.schema
            : compileType(config.schema),
        ),
    value: config.initialValue,
  } as const
}

function createEditorFromActor(editorActor: EditorActor): Editor {
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
      editorActor.send(event)
    },
    on: (event, listener) =>
      editorActor.on(
        event,
        // @ts-expect-error
        listener,
      ),
    _internal: {
      editable,
      editorActor,
      slateEditor,
    },
  }
}
