import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ActorRef, EventObject, Snapshot} from 'xstate'
import type {Behavior} from './behaviors/behavior.types.behavior'
import type {ExternalBehaviorEvent} from './behaviors/behavior.types.event'
import type {EditorDom} from './editor/editor-dom'
import type {ExternalEditorEvent} from './editor/editor-machine'
import type {EditorSnapshot} from './editor/editor-snapshot'
import type {EditorEmittedEvent} from './editor/relay-machine'
import type {Container, Leaf, TextBlock} from './renderers/renderer.types'

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
   * Register an editable container by `_type`, marking the array field
   * named in `childField` as editable child content. Optional `of`
   * carries nested registrations that override how immediate children of
   * this container render. Returns a function that unregisters the
   * container when called.
   *
   * @alpha
   */
  registerContainer: (container: Container) => () => void
  /**
   * Register a leaf renderer for a span, inline object, or void block
   * object by `_type`. Returns a function that unregisters the leaf
   * when called.
   *
   * @alpha
   */
  registerLeaf: (leaf: Leaf) => () => void
  /**
   * Register a text-block renderer. There is one text-block type
   * per editor (`'block'`); registering replaces the engine's default
   * text-block wrapper with consumer-provided JSX. Returns a function
   * that unregisters the text-block when called.
   *
   * @alpha
   */
  registerTextBlock: (textBlock: TextBlock) => () => void
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
