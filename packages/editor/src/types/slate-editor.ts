import type {Patch} from '@portabletext/patches'
import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {Range, Operation as SlateOperation} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {DecoratedRange} from '../editor/range-decorations-machine'
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

/**
 * Context passed during a split operation to help RangeDecorator
 * recompute decoration positions correctly.
 */
export interface SplitContext {
  /** The offset in the original block where the split occurs */
  splitOffset: number
  /** The _key of the block being split */
  originalBlockKey: string
  /** The _key of the new block created after the split */
  newBlockKey: string
  /** The _key of the original span (child) being split */
  originalSpanKey: string
  /** The _key of the new span in the new block (may be same or different) */
  newSpanKey: string
}

export interface PortableTextSlateEditor extends ReactEditor {
  _key: 'editor'
  _type: 'editor'

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
  value: Array<PortableTextBlock>

  /**
   * Context for the current split operation.
   * Set before delete+insert operations, cleared after.
   * Used by RangeDecorator to correctly recompute decoration positions.
   */
  splitContext: SplitContext | null

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
