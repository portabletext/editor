import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {ApplyContextFrame} from '../engine/core/apply-context'
import type {DOMEditor} from '../engine/dom/plugin/dom-editor'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {
  AnnotationConfig,
  BlockObjectConfig,
  DecoratorConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {ResolvedContainers} from '../schema/resolve-containers'
import type {Operation} from './operation'

type HistoryItem = {
  operations: EngineOperation[]
  timestamp: Date
}

interface History {
  redos: HistoryItem[]
  undos: HistoryItem[]
}

export type RemotePatch = {
  patch: Patch
  time: Date
  snapshot: PortableTextBlock[] | undefined
  previousSnapshot: PortableTextBlock[] | undefined
}

export interface PortableTextEditorEngine extends DOMEditor {
  _key: 'editor'
  _type: 'editor'

  /**
   * The attribution bracket stack: pushed on entry and popped in `finally`
   * by `withRemoteChanges`, `pluginUndoing`, `pluginRedoing`, and the
   * normalization brackets. `getOrigin` (`engine/core/apply-context.ts`)
   * reduces it to an `OperationOrigin`.
   */
  applyContext: Array<ApplyContextFrame>

  containers: ResolvedContainers
  annotations: Map<string, AnnotationConfig>
  blockObjects: Map<string, BlockObjectConfig>
  decorators: Map<string, DecoratorConfig>
  inlineObjects: Map<string, InlineObjectConfig>
  spans: Map<string, SpanConfig>
  textBlocks: Map<string, TextBlockConfig>

  decoratedRanges: Array<DecoratedRange>
  blockIndexMap: Map<string, number>
  history: History
  /**
   * Per-notify pending flags for the segmented selector channels
   * (`EngineSelectorChannel`). Set where the corresponding state mutates
   * (registration map swaps in `register-node-on-engine.ts`) and consumed
   * by the React layer's `onContextChange` dispatch; cleared only when
   * the notification is delivered.
   */
  selectorChannelsPending: {registrations: boolean}
  /**
   * Serialized paths of sibling groups (a node's keyed child array, or the
   * root value array as `''`) whose children have been verified to carry no
   * duplicate `_key`s. Per-node duplicate-key normalization skips groups
   * listed here. The op stream removes a group only when an operation
   * changes that group's own direct membership (insert/remove/re-key/replace
   * of a direct child), so an edit deep inside one group never forces a
   * re-scan of its ancestors, and an operation that introduces a subtree
   * also removes that subtree's groups so a reused key can't inherit a stale
   * verdict. Works identically at every depth; the root is just the group
   * with the empty path.
   */
  verifiedUniqueChildGroups: Set<string>
  remotePatches: Array<RemotePatch>
  undoStepId: string | undefined

  isDeferringMutations: boolean
  /**
   * The last host value recorded by a value sync that changed the engine. A
   * pristine block equal to it is persisted content, not the local
   * placeholder. Syncs that write nothing are not recorded: hosts mirror
   * `mutation.value` back as `update value`, and such an echo of the
   * editor's own state (its placeholder included) is not a claim that the
   * value is persisted.
   */
  lastSyncedValue: Array<PortableTextBlock> | undefined
  /**
   * True while this editor's own emitted patch stream has destroyed the
   * field (a root `unset([])` went out) and not yet re-materialized it (a
   * root `setIfMissing` or `set` went out since). While true, patch
   * generation rebuilds the field before targeting it again, and both it
   * and remote root inserts treat a placeholder equal to `lastSyncedValue`
   * as unpersisted rather than as proof the field survived.
   */
  valueUnsetEmitted: boolean
  isPatching: boolean
  isPerformingBehaviorOperation: boolean
  withHistory: boolean

  /**
   * Called by `withRemoteChanges` once per bracket, with the operations
   * applied inside it (`set.selection` excluded). Never called with an
   * empty `operations` array. Wired to the relay at editor setup.
   */
  onRemoteChange: (operations: Array<Operation>) => void

  /**
   * The current {@link EditorSnapshot}. Reassigned (new object reference)
   * whenever the editor's observable state changes, and only then. Reads
   * are reference-stable between mutations, which lets
   * `useSyncExternalStore` short-circuit before invoking selectors.
   *
   * `editor.getSnapshot()` returns this property. Internal callers can
   * also read it directly to avoid building snapshots ad-hoc.
   */
  snapshot: EditorSnapshot
}
