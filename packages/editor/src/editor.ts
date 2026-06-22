import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {Behavior} from './behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from './behaviors/behavior.types.event'
import type {EditorDom} from './editor/editor-dom'
import type {ExternalEditorEvent} from './editor/editor-machine'
import type {EditorSnapshot} from './editor/editor-snapshot'
import type {EditorEmittedEvent} from './editor/relay'
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
  /**
   * Register an event listener.
   *
   * With `{batch: true}` the listener is called once per burst with
   * `Array<Event>`, every matching event emitted before control returns to the
   * event loop (one synchronous `editor.send` worth, normalization included),
   * in delivery order, on the trailing microtask. That is the same boundary at
   * which the editor settles its own state, so each call is one fully-applied,
   * normalized change. Without it (the default), the listener runs
   * synchronously for every event and receives a single event.
   */
  on: {
    <TType extends EditorEmittedEvent['type'] | '*'>(
      type: TType,
      listener: (
        events: Array<
          EditorEmittedEvent & (TType extends '*' ? unknown : {type: TType})
        >,
      ) => void,
      options: {batch: true},
    ): {unsubscribe: () => void}
    <TType extends EditorEmittedEvent['type'] | '*'>(
      type: TType,
      listener: (
        event: EditorEmittedEvent &
          (TType extends '*' ? unknown : {type: TType}),
      ) => void,
      options?: {batch?: false},
    ): {unsubscribe: () => void}
  }
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
