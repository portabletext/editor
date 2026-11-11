import type {Patch} from '@portabletext/patches'
import type {OperationOrigin} from './operation-channel'

/**
 * A frame pushed onto `editor.applyContext` for the duration of an
 * attribution bracket (remote changes, undo, redo, normalization, the
 * empty-editor placeholder insert, a repair of received content). Brackets nest, so a normalization that
 * fires while replaying a remote patch pushes a `normalization` frame on
 * top of the still-active `remote` one; both stay visible to `getOrigin`
 * below instead of only the innermost.
 */
export type ApplyContextFrame =
  | {
      kind: 'remote'
      source: 'patches' | 'update-value' | 'initial-sync' | 'load'
    }
  | {kind: 'undo'}
  | {kind: 'redo'}
  | {kind: 'normalization'}
  | {kind: 'placeholder'}
  /**
   * A `validateValue` auto-resolution applied to content received through
   * `update value`. `patches` are the resolution's own patches for the
   * operation, the ones the host receives for it. `sentAfterChange`: the
   * sync sends them as its own `patch` events, which go out after every
   * patch the change's operations generate.
   */
  | {kind: 'repair'; patches: Array<Patch>; sentAfterChange: boolean}

/**
 * Reduces the frame stack to an `OperationOrigin` by fixed precedence
 * (undo > redo > normalization > remote > local), regardless of nesting
 * order. Normalization outranks remote so a fix that runs while replaying
 * a remote patch is attributed to the fix, not laundered into looking like
 * an ordinary remote write; `hasRemoteFrame` is the precedence-blind read
 * for callers that need the externally-triggered fact regardless of
 * whether a fix ran on top of it.
 */
export function getOrigin(
  frames: ReadonlyArray<ApplyContextFrame>,
): OperationOrigin {
  if (frames.some((frame) => frame.kind === 'undo')) {
    return 'undo'
  }
  if (frames.some((frame) => frame.kind === 'redo')) {
    return 'redo'
  }
  if (frames.some((frame) => frame.kind === 'normalization')) {
    return 'normalization'
  }
  if (frames.some((frame) => frame.kind === 'remote')) {
    return 'remote'
  }
  return 'local'
}

/**
 * True while the frame stack carries a `remote` frame at any depth: the
 * editor is applying content that arrived from outside (`apply`
 * or value sync), possibly nested inside a normalization fix.
 * `normalize-node`'s readers gate optional fix-ups on it to leave adopted
 * content alone; `apply-operation` skips inverse population; the sync
 * machine treats it as busy.
 */
export function hasRemoteFrame(
  frames: ReadonlyArray<ApplyContextFrame>,
): boolean {
  return frames.some((frame) => frame.kind === 'remote')
}

/**
 * Precedence-blind: true whenever a `normalization` frame is on the stack,
 * even when an `undo` or `redo` frame outranks it in `getOrigin`.
 */
export function isInNormalization(
  frames: ReadonlyArray<ApplyContextFrame>,
): boolean {
  return frames.some((frame) => frame.kind === 'normalization')
}

/**
 * The resolution patches of the innermost `repair` frame, or none.
 */
export function getRepairPatches(
  frames: ReadonlyArray<ApplyContextFrame>,
): Array<Patch> | undefined {
  return frames.findLast((frame) => frame.kind === 'repair')?.patches
}

/**
 * Whether the innermost `repair` frame's patches are sent after the
 * change.
 */
export function isRepairSentAfterChange(
  frames: ReadonlyArray<ApplyContextFrame>,
): boolean {
  return (
    frames.findLast((frame) => frame.kind === 'repair')?.sentAfterChange ??
    false
  )
}

/**
 * True while the editor inserts the empty block it shows in an empty
 * field.
 */
export function isPlaceholder(
  frames: ReadonlyArray<ApplyContextFrame>,
): boolean {
  return frames.some((frame) => frame.kind === 'placeholder')
}
