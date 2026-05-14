import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {LeafConfig, TextBlockConfig} from '../renderers/renderer.types'
import type {Containers, ResolvedContainers} from '../schema/resolve-containers'
import type {DOMEditor} from '../slate/dom/plugin/dom-editor'
import type {Operation as SlateOperation} from '../slate/interfaces/operation'

type HistoryItem = {
  operations: SlateOperation[]
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

export interface PortableTextSlateEditor extends DOMEditor {
  _key: 'editor'
  _type: 'editor'

  schema: EditorSchema
  keyGenerator: () => string
  containers: ResolvedContainers
  /**
   * Narrow {@link Containers} projection of `containers`, exposed on the
   * public `EditorContext.containers`. Maintained in sync with
   * `containers` by the editor machine's register/unregister handlers.
   */
  publicContainers: Containers
  leaves: Map<string, LeafConfig>
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
}
