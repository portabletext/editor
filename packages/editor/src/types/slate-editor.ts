import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {ResolvedContainers} from '../schema/resolve-containers'
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
