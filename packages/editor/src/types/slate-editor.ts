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
import type {EditorSelection, RangeDecoration} from './editor'
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
  /** The child index of the span being split */
  splitChildIndex: number
  /** The _key of the block being split */
  originalBlockKey: string
  /** The _key of the new block created after the split */
  newBlockKey: string
  /** The _key of the original span (child) being split */
  originalSpanKey: string
  /** The _key of the new span in the new block (may be same or different) */
  newSpanKey: string
}

/**
 * Context passed during a merge operation to help RangeDecorator
 * recompute decoration positions correctly.
 *
 * During a forward-delete merge (Delete at end of block 1) or
 * backward-delete merge (Backspace at start of block 2), the
 * second block is deleted and its content is re-inserted into
 * the first block. This context helps track that relationship.
 */
export interface MergeContext {
  /** The _key of the block being deleted (block whose content is moving) */
  deletedBlockKey: string
  /** The _key of the block receiving the content */
  targetBlockKey: string
  /** The text length of the target block before merge (insertion offset) */
  targetBlockTextLength: number
  /** The index of the deleted block at the time context was created */
  deletedBlockIndex: number
  /** The index of the target block at the time context was created */
  targetBlockIndex: number
  /** The number of children in the target block before merge.
   *  Used to compute correct insertion indices for multi-child blocks
   *  (e.g., blocks with bold/italic spans). Child N from the deleted block
   *  ends up at index targetOriginalChildCount + N in the target block. */
  targetOriginalChildCount: number
}

export interface PortableTextSlateEditor extends ReactEditor {
  _key: 'editor'
  _type: 'editor'

  isTextBlock: (value: unknown) => value is PortableTextTextBlock
  isTextSpan: (value: unknown) => value is PortableTextSpan
  isListBlock: (value: unknown) => value is PortableTextListBlock

  decoratedRanges: Array<DecoratedRange>
  /**
   * Snapshot of decoration state taken before a remote batch starts.
   * Used by the reconciliation handler to diff pre-batch vs post-batch
   * and fire a single onMoved callback per changed decoration.
   * Stores both the Slate Range (for change detection) and the
   * EditorSelection (for previousSelection in onMoved callbacks).
   * Managed by the apply interceptor in range-decorations-machine.
   */
  preBatchDecorationRanges: Map<
    RangeDecoration,
    {range: Range | null; selection: EditorSelection}
  >
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

  /**
   * Context for the current merge operation.
   * Set before delete+insert operations, cleared after.
   * Used by RangeDecorator to correctly recompute decoration positions.
   */
  mergeContext: MergeContext | null

  /**
   * Tracks which decoration points were on the deleted block BEFORE
   * `remove_node` shifts paths. Computed during `remove_node` and consumed
   * during `insert_node` to avoid stale-index collisions where a shifted
   * point coincidentally lands at `deletedBlockIndex`.
   */
  mergeDeletedBlockFlags: Map<
    RangeDecoration,
    {anchor: boolean; focus: boolean}
  > | null

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
