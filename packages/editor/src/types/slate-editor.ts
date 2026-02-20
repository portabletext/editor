import type {Patch} from '@portabletext/patches'
import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {Range, Operation as SlateOperation} from '../slate'
import type {ReactEditor} from '../slate-react'
import type {EditorSelection} from './editor'
// Side-effect import to ensure Slate module augmentation is included
import './slate'

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

  // Override children to be PT-typed (editor.children IS the PT value)
  children: Array<PortableTextBlock>

  isTextBlock: (value: unknown) => value is PortableTextTextBlock
  isTextSpan: (value: unknown) => value is PortableTextSpan
  isListBlock: (value: unknown) => value is PortableTextListBlock

  decoratedRanges: Array<DecoratedRange>
  decoratorState: Record<string, boolean | undefined>
  blockIndexMap: Map<string, number>
  history: History
  lastSelection: EditorSelection
  lastSlateSelection: Range | null
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
   * Undo
   */
  undo: () => void

  /**
   * Redo
   */
  redo: () => void
}
