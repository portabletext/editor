import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ActorRef, EventObject, Snapshot} from 'xstate'
import type {Behavior} from './behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from './behaviors/behavior.types.event'
import type {EditorDom} from './editor/editor-dom'
import type {ExternalEditorEvent} from './editor/editor-machine'
import type {EditorSnapshot} from './editor/editor-snapshot'
import type {EditorEmittedEvent} from './editor/relay-machine'
import type {Renderer} from './renderers/renderer.types'

/**
 * @public
 */
export type EditorConfig = {
  /**
   * @beta
   */
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
 * @public
 */
export type EditorEvent =
  | ExternalEditorEvent
  | ExternalBehaviorEvent
  | {
      type: 'update value'
      value: Array<PortableTextBlock> | undefined
    }

/**
 * @public
 */
export type Editor = {
  dom: EditorDom
  getSnapshot: () => EditorSnapshot
  /**
   * @beta
   */
  registerBehavior: (config: {behavior: Behavior}) => () => void
  /**
   * @beta
   * Register a custom renderer for a specific node type.
   *
   * @example
   * ```tsx
   * // Block object renderer (type: 'block', name matches the object type)
   * const unregister = editor.registerRenderer({
   *   renderer: defineRenderer<typeof schema>()({
   *     type: 'block',
   *     name: 'image',
   *     render: ({attributes, children, node}) => (
   *       <figure {...attributes}>
   *         <img src={node.src} alt={node.alt} />
   *         {children}
   *       </figure>
   *     ),
   *   }),
   * })
   * ```
   */
  registerRenderer: (config: {renderer: Renderer}) => () => void
  send: (event: EditorEvent) => void
  on: ActorRef<Snapshot<unknown>, EventObject, EditorEmittedEvent>['on']
}
