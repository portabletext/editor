import type {
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
  SetOperation,
  UnsetOperation,
} from '../engine/interfaces/operation'

/**
 * The document-changing operations emitted through
 * `editor.on('operation', ...)`. Every change to the editor (local edits,
 * remote patches, value sync, normalization fixes, undo/redo) is expressed
 * as a sequence of these five operations.
 *
 * The vocabulary is closed: there are exactly five, listed explicitly so
 * that a new engine operation never becomes public surface by default, and
 * the dot-named ones (`insert.text`, `remove.text`) are not namespaces that
 * grow members.
 *
 * Selection movements are not emitted on this stream; subscribe to the
 * `selection` event instead.
 *
 * Operation objects are the engine's own, passed by reference: treat them
 * as read-only and copy anything you retain beyond the listener call.
 *
 * Delivery order: normalization fix operations are delivered adjacent to
 * the operation that triggered them, but whether a fix arrives before or
 * after its trigger depends on how the trigger was applied (a fix
 * re-enters the engine's apply, so an unbatched trigger delivers the fix
 * first; batched applies deliver fixes after the batch). Do not assume
 * delivery order equals application order under normalization: seed
 * derived state from `editor.getSnapshot()` and recompute on change
 * rather than replaying deltas blindly.
 *
 * `inverse`, when present, reflects what the engine itself needs to make
 * the operation reversible. Its presence follows the engine's history
 * policy and is not a stable per-operation contract.
 *
 * @beta
 */
export type Operation =
  | InsertOperation
  | InsertTextOperation
  | RemoveTextOperation
  | SetOperation
  | UnsetOperation
