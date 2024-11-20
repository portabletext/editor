import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import {useActorRef} from '@xstate/react'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import type {Behavior, PickFromUnion} from './behavior/behavior.types'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import {compileSchemaDefinition, type SchemaDefinition} from './define-schema'
import {
  editorMachine,
  type EditorActor,
  type InternalEditorEvent,
} from './editor-machine'
import {defaultKeyGenerator} from './key-generator'

/**
 * @alpha
 */
export type EditorConfig = {
  behaviors?: Array<Behavior>
  keyGenerator?: () => string
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
  | 'focus'
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
  on: EditorActor['on']
  _internal: {
    editorActor: EditorActor
    slateEditor: SlateEditor
  }
}

/**
 * @alpha
 */
export function useEditor(config: EditorConfig): Editor {
  const editorActor = useActorRef(editorMachine, {
    input: {
      behaviors: config.behaviors,
      keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
      readOnly: config.readOnly,
      schema: config.schemaDefinition
        ? compileSchemaDefinition(config.schemaDefinition)
        : getPortableTextMemberSchemaTypes(
            config.schema.hasOwnProperty('jsonType')
              ? config.schema
              : compileType(config.schema),
          ),
      value: config.initialValue,
    },
  })
  const slateEditor = createSlateEditor({editorActor})

  return {
    send: (event) => {
      editorActor.send(event)
    },
    on: (event, listener) => editorActor.on(event, listener),
    _internal: {
      editorActor,
      slateEditor,
    },
  }
}
