import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ActorRef, EventObject, Snapshot} from 'xstate'
import type {Behavior} from './behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from './behaviors/behavior.types.event'
import type {EditorDom} from './editor/editor-dom'
import type {ExternalEditorEvent} from './editor/editor-machine'
import type {EditorSnapshot} from './editor/editor-snapshot'
import type {EditorEmittedEvent} from './editor/publish'
import type {RegistrableNode} from './renderers/renderer.types'

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
  schemaDefinition: SchemaDefinition
}

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
   * Register a node renderer. The `node` argument is the result of one
   * of the `defineX` factories (`defineContainer`, `defineTextBlock`,
   * `defineSpan`, `defineBlockObject`, `defineInlineObject`). Returns
   * a function that unregisters the node when called.
   *
   * @alpha
   */
  registerNode: (config: {node: RegistrableNode}) => () => void
  send: (event: EditorEvent) => void
  on: ActorRef<Snapshot<unknown>, EventObject, EditorEmittedEvent>['on']
  /**
   * Subscribe to editor state changes. The observer's `next` callback fires
   * with the current `EditorSnapshot` on every relevant transition (selection
   * updates, content mutations, behavior dispatch, configuration changes).
   *
   * The editor has no terminal state and no error path, so `error` and
   * `complete` are part of the observable contract but never fire. They are
   * kept for structural compatibility with `useSyncExternalStore`,
   * `@xstate/react`'s `useSelector`, and other observer-shaped consumers.
   */
  subscribe(observer: {
    next?: (snapshot: EditorSnapshot) => void
    error?: (err: unknown) => void
    complete?: () => void
  }): {unsubscribe: () => void}
}
