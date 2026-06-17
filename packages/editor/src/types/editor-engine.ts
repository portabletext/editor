import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {DOMEditor} from '../engine/dom/plugin/dom-editor'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {
  BlockObjectConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {ResolvedContainers} from '../schema/resolve-containers'

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

  containers: ResolvedContainers
  blockObjects: Map<string, BlockObjectConfig>
  inlineObjects: Map<string, InlineObjectConfig>
  spans: Map<string, SpanConfig>
  textBlocks: Map<string, TextBlockConfig>

  decoratedRanges: Array<DecoratedRange>
  blockIndexMap: Map<string, number>
  history: History
  listIndexMap: Map<string, number>
  /**
   * `listIndexMap` is derived from the whole value (list-item numbering
   * depends on block adjacency), so structural operations invalidate it
   * rather than rebuild it. The only reader is the text-block renderer,
   * which rebuilds on demand via `getListIndexMap`. Deferring the rebuild
   * to read time collapses a per-operation O(value) walk into one rebuild
   * per render, regardless of how many operations a batch applied.
   */
  listIndexMapDirty: boolean
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
  isNormalizingNode: boolean
  isPatching: boolean
  isPerformingBehaviorOperation: boolean
  isProcessingRemoteChanges: boolean
  isRedoing: boolean
  isUndoing: boolean
  withHistory: boolean

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
