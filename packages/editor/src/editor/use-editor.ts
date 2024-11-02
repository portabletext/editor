import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import {useActorRef} from '@xstate/react'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import type {Behavior} from './behavior/behavior.types'
import {compileSchemaDefinition, type SchemaDefinition} from './define-schema'
import {editorMachine} from './editor-machine'
import {defaultKeyGenerator} from './key-generator'

/**
 * @alpha
 */
export type EditorConfig = {
  behaviors?: Array<Behavior>
  keyGenerator?: () => string
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
export type Editor = ReturnType<typeof useEditor>

/**
 * @alpha
 */
export function useEditor(config: EditorConfig) {
  const schema = config.schemaDefinition
    ? compileSchemaDefinition(config.schemaDefinition)
    : getPortableTextMemberSchemaTypes(
        config.schema.hasOwnProperty('jsonType')
          ? config.schema
          : compileType(config.schema),
      )

  const editorActor = useActorRef(editorMachine, {
    input: {
      behaviors: config.behaviors,
      keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
      schema,
    },
  })

  return editorActor
}
