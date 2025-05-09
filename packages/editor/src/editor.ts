import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import type {ActorRef, EventObject, Snapshot} from 'xstate'
import type {Behavior} from './behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from './behaviors/behavior.types.event'
import type {
  EditorEmittedEvent,
  ExternalEditorEvent,
} from './editor/editor-machine'
import type {SchemaDefinition} from './editor/editor-schema'
import type {EditorSnapshot} from './editor/editor-snapshot'

/**
 * @public
 */
export type EditorConfig = {
  /**
   * @beta
   */
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
