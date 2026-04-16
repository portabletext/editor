import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {LeafConfig} from '../renderers/renderer.types'
import type {Containers} from '../schema/resolve-containers'
import type {Operation as SlateOperation} from '../slate/interfaces/operation'
import type {ReactEditor} from '../slate/react/plugin/react-editor'

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

export interface PortableTextSlateEditor extends ReactEditor {
  _key: 'editor'
  _type: 'editor'

  schema: EditorSchema
  keyGenerator: () => string
  containers: Containers
  leafConfigs: Map<string, LeafConfig>

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
