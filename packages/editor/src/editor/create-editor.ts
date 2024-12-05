import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import {useActorRef} from '@xstate/react'
import {useCallback, useMemo} from 'react'
import {
  createActor,
  type ActorRef,
  type EventObject,
  type Snapshot,
} from 'xstate'
import type {EditableAPI} from '../types/editor'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import type {Behavior, PickFromUnion} from './behavior/behavior.types'
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

/**
 * @internal
 */
export function createEditor(config: EditorConfig): Editor {
  const editorActor = createActor(editorMachine, {
    input: editorConfigToMachineInput(config),
  })

  editorActor.start()

  const slateEditor = createSlateEditor({editorActor})
  const editable = createEditableAPI(slateEditor.instance, editorActor)

  return {
    send: (event) => {
      editorActor.send(event)
    },
    on: (event, listener) =>
      editorActor.on(
        event,
        // @ts-ignore
        listener,
      ),
    _internal: {
      editable,
      editorActor,
      slateEditor,
    },
  }
}

export function useCreateEditor(config: EditorConfig): Editor {
  const editorActor = useActorRef(editorMachine, {
    input: editorConfigToMachineInput(config),
  })
  const slateEditor = createSlateEditor({editorActor})
  const editable = useMemo(
    () => createEditableAPI(slateEditor.instance, editorActor),
    [slateEditor.instance, editorActor],
  )
  const send = useCallback(
    (event: EditorEvent) => {
      editorActor.send(event)
    },
    [editorActor],
  )
  const on = useCallback<Editor['on']>(
    (event, listener) =>
      editorActor.on(
        event,
        // @ts-ignore
        listener,
      ),
    [editorActor],
  )
  const editor: Editor = useMemo(
    () => ({
      send,
      on,
      _internal: {
        editable,
        editorActor,
        slateEditor,
      },
    }),
    [send, on, editable, editorActor, slateEditor],
  )

  return editor
}

function editorConfigToMachineInput(config: EditorConfig) {
  return {
    behaviors: config.behaviors,
    keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
    maxBlocks: config.maxBlocks,
    readOnly: config.readOnly,
    schema: config.schemaDefinition
      ? compileSchemaDefinition(config.schemaDefinition)
      : getPortableTextMemberSchemaTypes(
          config.schema.hasOwnProperty('jsonType')
            ? config.schema
            : compileType(config.schema),
        ),
    value: config.initialValue,
  } as const
}
