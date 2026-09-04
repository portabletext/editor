import type {OperationOrigin} from './operation-channel'

/**
 * A frame pushed onto `editor.applyContext` for the duration of an
 * attribution bracket (remote changes, undo, redo, normalization). Brackets
 * nest, so a normalization that fires while replaying a remote patch pushes
 * a `normalization` frame on top of the still-active `remote` one; both
 * stay visible to `getOrigin` below instead of only the innermost.
 */
export type ApplyContextFrame =
  | {kind: 'remote'; source: 'patches' | 'update-value' | 'initial-sync'}
  | {kind: 'undo'}
  | {kind: 'redo'}
  | {kind: 'normalization'}

/**
 * Reduces the frame stack to an `OperationOrigin` by fixed precedence
 * (remote > undo > redo > normalization > local), regardless of nesting
 * order.
 */
export function getOrigin(
  frames: ReadonlyArray<ApplyContextFrame>,
): OperationOrigin {
  if (frames.some((frame) => frame.kind === 'remote')) {
    return 'remote'
  }
  if (frames.some((frame) => frame.kind === 'undo')) {
    return 'undo'
  }
  if (frames.some((frame) => frame.kind === 'redo')) {
    return 'redo'
  }
  if (frames.some((frame) => frame.kind === 'normalization')) {
    return 'normalization'
  }
  return 'local'
}
