import type {EditorSelection} from '../types/editor'
import type {BlockPath} from '../types/paths'
import type {PTChange} from './pt-change-detector'

// ---------------------------------------------------------------------------
// Behavior event types — the subset of PTE's BehaviorEvent union that the
// change detector can produce. These match the shapes defined in
// behavior.types.event.ts exactly.
// ---------------------------------------------------------------------------

/**
 * A behavior event produced by mapping a PTChange.
 *
 * These are real PTE behavior events — they can be dispatched directly via
 * `editorActor.send({type: 'behavior event', behaviorEvent, editor})`.
 *
 * The types here mirror the canonical definitions in behavior.types.event.ts.
 * We re-declare them as a narrow union so that callers of this module get
 * precise types without importing the full BehaviorEvent union.
 */
export type PTChangeBehaviorEvent =
  | {type: 'insert.text'; text: string}
  | {type: 'insert.break'}
  | {type: 'delete.backward'; unit: 'character' | 'word' | 'line' | 'block'}
  | {type: 'delete.forward'; unit: 'character' | 'word' | 'line' | 'block'}
  | {
      type: 'delete'
      direction?: 'backward' | 'forward'
      unit?: 'character' | 'word' | 'line' | 'block' | 'child'
      at?: NonNullable<EditorSelection>
    }
  | {type: 'delete.block'; at: BlockPath}

/**
 * The result of mapping a PTChange to behavior events.
 *
 * Most changes produce a single event. A `text-replace` produces two events
 * (delete then insert) that must be dispatched in order. `no-change` produces
 * an empty array.
 *
 * The `selectionBefore` field, when present, indicates the selection that
 * should be set on the editor BEFORE dispatching the behavior events. This
 * is necessary because behavior guards read the selection from the editor
 * snapshot to determine context (e.g., "am I at the start of a block?").
 */
export interface PTChangeMappingResult {
  /**
   * The behavior events to dispatch, in order.
   * Empty array means no events (e.g., for `no-change`).
   */
  events: Array<PTChangeBehaviorEvent>

  /**
   * Optional selection to set before dispatching events.
   * Expressed as a collapsed cursor position: {blockKey, offset}.
   * The caller is responsible for converting this to a full EditorSelection
   * and setting it on the editor before dispatching.
   */
  selectionBefore?: {
    blockKey: string
    offset: number
  }
}

// ---------------------------------------------------------------------------
// Mapping function
// ---------------------------------------------------------------------------

/**
 * Map a detected PT change to the corresponding PTE behavior event(s).
 *
 * This is the bridge between the diff module (which detects what changed
 * between two PT snapshots) and PTE's behavior system (which processes
 * semantic editing intents).
 *
 * @param change - The PTChange detected by the diff module.
 * @param cursorOffset - The cursor offset at the time of the change, used to
 *   determine deletion direction for `text-delete`. If not provided, deletion
 *   direction defaults to backward (the common case — Backspace is far more
 *   frequent than Delete on mobile).
 *
 * @returns A mapping result containing the behavior events to dispatch and
 *   optional selection context to set beforehand.
 */
export function ptChangeToBehaviorEvent(
  change: PTChange,
  cursorOffset?: number,
): PTChangeMappingResult {
  switch (change.type) {
    case 'text-insert':
      return mapTextInsert(change)

    case 'text-delete':
      return mapTextDelete(change, cursorOffset)

    case 'text-replace':
      return mapTextReplace(change)

    case 'block-split':
      return mapBlockSplit(change)

    case 'block-merge':
      return mapBlockMerge(change)

    case 'block-insert':
      return mapBlockInsert(change)

    case 'block-delete':
      return mapBlockDelete(change)

    case 'no-change':
      return {events: []}
  }
}

// ---------------------------------------------------------------------------
// Individual mappers
// ---------------------------------------------------------------------------

/**
 * Text was inserted at a known offset in a block.
 *
 * Maps to `insert.text`. Selection should be positioned at the insertion
 * point (before the new text) so that the behavior inserts at the right
 * place.
 */
function mapTextInsert(change: {
  type: 'text-insert'
  blockKey: string
  offset: number
  text: string
}): PTChangeMappingResult {
  return {
    events: [{type: 'insert.text', text: change.text}],
    selectionBefore: {
      blockKey: change.blockKey,
      offset: change.offset,
    },
  }
}

/**
 * Text was deleted from a range in a block.
 *
 * We need to determine the deletion direction:
 * - If the cursor was AFTER the deleted range → backward deletion (Backspace)
 * - If the cursor was BEFORE the deleted range → forward deletion (Delete key)
 * - If unknown, default to backward (most common on mobile)
 *
 * We use the generic `delete` event with an `at` selection covering the
 * deleted range. This is more precise than `delete.backward` with a unit,
 * because the diff tells us exactly what was deleted — we don't need to
 * guess the unit.
 */
function mapTextDelete(
  change: {
    type: 'text-delete'
    blockKey: string
    spanKey: string
    from: number
    to: number
  },
  cursorOffset?: number,
): PTChangeMappingResult {
  const deletionDirection = inferDeletionDirection(change, cursorOffset)

  // Use the generic `delete` event with the exact range.
  // The `at` selection covers the deleted text so the behavior system
  // knows exactly what to remove.
  const deleteSelection: NonNullable<EditorSelection> = {
    anchor: {
      path: [{_key: change.blockKey}, 'children', {_key: change.spanKey}],
      offset: change.from,
    },
    focus: {
      path: [{_key: change.blockKey}, 'children', {_key: change.spanKey}],
      offset: change.to,
    },
  }

  return {
    events: [
      {
        type: 'delete',
        direction: deletionDirection,
        at: deleteSelection,
      },
    ],
    selectionBefore: {
      blockKey: change.blockKey,
      // Position cursor at the appropriate end based on direction
      offset: deletionDirection === 'forward' ? change.from : change.to,
    },
  }
}

/**
 * Text was replaced (deleted then inserted) in a single mutation.
 *
 * This happens with autocorrect, IME composition commits, and similar
 * browser-level replacements. We model it as two sequential events:
 * 1. Delete the old text (backward direction, since the text is being
 *    replaced "in place")
 * 2. Insert the new text
 *
 * The selection before dispatch should be at the END of the range being
 * replaced, so the backward delete removes the right text.
 */
function mapTextReplace(change: {
  type: 'text-replace'
  blockKey: string
  spanKey: string
  from: number
  to: number
  text: string
}): PTChangeMappingResult {
  // Use the generic `delete` with an explicit `at` range for precision
  const deleteSelection: NonNullable<EditorSelection> = {
    anchor: {
      path: [{_key: change.blockKey}, 'children', {_key: change.spanKey}],
      offset: change.from,
    },
    focus: {
      path: [{_key: change.blockKey}, 'children', {_key: change.spanKey}],
      offset: change.to,
    },
  }

  return {
    events: [
      {
        type: 'delete',
        direction: 'backward',
        at: deleteSelection,
      },
      {type: 'insert.text', text: change.text},
    ],
    selectionBefore: {
      blockKey: change.blockKey,
      offset: change.to,
    },
  }
}

/**
 * A block was split into two (Enter key).
 *
 * Maps to `insert.break`. Selection should be at the split point in the
 * original block.
 */
// TODO: On the slow path, structural changes (merge/split) should be
// applied as direct Slate transforms (state sync) rather than behavior
// events (intent processing). The browser already executed the intent;
// we're reconciling, not intercepting. See PR #2276 review discussion.
function mapBlockSplit(change: {
  type: 'block-split'
  originalBlockKey: string
  newBlockKey: string
  splitOffset: number
}): PTChangeMappingResult {
  return {
    events: [{type: 'insert.break'}],
    selectionBefore: {
      blockKey: change.originalBlockKey,
      offset: change.splitOffset,
    },
  }
}

/**
 * Two blocks were merged into one (Backspace at start of block, or Delete
 * at end of block).
 *
 * Maps to `delete.backward` at the block boundary. The join offset tells
 * us where the two blocks meet in the surviving block — that's where the
 * cursor should be positioned.
 *
 * We use `delete.backward` with `unit: 'character'` because that's what
 * PTE's keyboard behavior raises for Backspace, and the abstract delete
 * behavior handles the block-boundary merge case when the cursor is at
 * the start of a block.
 */
// TODO: On the slow path, structural changes (merge/split) should be
// applied as direct Slate transforms (state sync) rather than behavior
// events (intent processing). The browser already executed the intent;
// we're reconciling, not intercepting. See PR #2276 review discussion.
function mapBlockMerge(change: {
  type: 'block-merge'
  survivingBlockKey: string
  removedBlockKey: string
  joinOffset: number
}): PTChangeMappingResult {
  // Position cursor at the join point in the surviving block. The removed
  // block no longer exists in the DOM when this fires, so we reference the
  // surviving block at the offset where the two blocks meet. From this
  // position, a backward delete at the block boundary triggers the merge
  // behavior.
  return {
    events: [{type: 'delete.backward', unit: 'character'}],
    selectionBefore: {
      blockKey: change.survivingBlockKey,
      offset: change.joinOffset,
    },
  }
}

/**
 * A new block was inserted.
 *
 * This is structurally similar to a block split — the most common cause
 * is pressing Enter which creates a new empty block. We map it to
 * `insert.break` since that's the semantic intent.
 *
 * Note: If the block was inserted via paste or drag-drop, the deserialize
 * behavior path handles it separately. This mapper only handles the
 * simple "new block appeared" case.
 */
function mapBlockInsert(_change: {
  type: 'block-insert'
  blockKey: string
  index: number
}): PTChangeMappingResult {
  // For a bare block insert (no split context), we still treat it as a
  // break insertion. The selection context is less precise here since we
  // don't know the cursor position within the previous block.
  return {
    events: [{type: 'insert.break'}],
  }
}

/**
 * A block was deleted entirely.
 *
 * Maps to `delete.block` with the block's path. This is a precise
 * deletion — we know exactly which block was removed.
 */
function mapBlockDelete(change: {
  type: 'block-delete'
  blockKey: string
  index: number
}): PTChangeMappingResult {
  return {
    events: [{type: 'delete.block', at: [{_key: change.blockKey}]}],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Infer the deletion direction from the cursor position relative to the
 * deleted range.
 *
 * - Cursor at or after `to` → backward (Backspace: cursor was after the text)
 * - Cursor at or before `from` → forward (Delete key: cursor was before the text)
 * - Cursor inside the range or unknown → backward (safe default)
 */
function inferDeletionDirection(
  change: {from: number; to: number},
  cursorOffset?: number,
): 'backward' | 'forward' {
  if (cursorOffset === undefined) {
    // Default to backward — Backspace is the overwhelmingly common case,
    // especially on mobile where the Delete key doesn't exist.
    return 'backward'
  }

  if (cursorOffset <= change.from) {
    return 'forward'
  }

  // Cursor is at, after, or inside the deleted range → backward
  return 'backward'
}
