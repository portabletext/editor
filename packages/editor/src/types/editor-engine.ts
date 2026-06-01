import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {DOMEditor} from '../engine/dom/plugin/dom-editor'
import type {Operation as EngineOperation} from '../engine/interfaces/operation'
import type {
  BlockObjectConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {Containers, ResolvedContainers} from '../schema/resolve-containers'

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

  schema: EditorSchema
  keyGenerator: () => string
  converters: Array<Converter>
  readOnly: boolean
  containers: ResolvedContainers
  /**
   * Narrow {@link Containers} projection of `containers`, exposed on the
   * public `EditorContext.containers`. Maintained in sync with
   * `containers` by the editor machine's register/unregister handlers.
   */
  publicContainers: Containers
  blockObjects: Map<string, BlockObjectConfig>
  inlineObjects: Map<string, InlineObjectConfig>
  spans: Map<string, SpanConfig>
  textBlocks: Map<string, TextBlockConfig>

  /**
   * Snapshot-shaped view onto the editor's traversal state. Mirrors the
   * shape of `EditorSnapshot.context`.
   */
  readonly context: {
    schema: EditorSchema
    containers: Containers
    value: PortableTextBlock[]
    keyGenerator: () => string
  }

  decoratedRanges: Array<DecoratedRange>
  decoratorState: Record<string, boolean | undefined>
  blockIndexMap: Map<string, number>
  history: History
  listIndexMap: Map<string, number>
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
