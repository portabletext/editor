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
import type {Behavior} from '../behaviors/behavior.types'
import type {PickFromUnion} from '../type-utils'
import type {EditableAPI} from '../types/editor'
import {compileType} from '../utils/schema'
import {createEditorSchema} from './create-editor-schema'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import {compileSchemaDefinition, type SchemaDefinition} from './define-schema'
import {
  editorMachine,
  type EditorActor,
  type EditorEmittedEvent,
  type InternalEditorEvent,
} from './editor-machine'
import {defaultKeyGenerator} from './key-generator'
import {createEditableAPI} from './plugins/createWithEditableAPI'

/**
 * @alpha
 */
export type EditorConfig = {
  behaviors?: Array<Behavior>
  keyGenerator?: () => string
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
 * @alpha
 */
export type EditorEvent = PickFromUnion<
  InternalEditorEvent,
  'type',
  | 'annotation.toggle'
  | 'blur'
  | 'decorator.add'
  | 'decorator.remove'
  | 'decorator.toggle'
  | 'focus'
  | 'insert.block object'
  | 'insert.inline object'
  | 'list item.toggle'
  | 'style.toggle'
  | 'patches'
  | 'toggle readOnly'
  | 'update behaviors'
  | 'update value'
>

/**
 * @alpha
 */
export type Editor = {
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
