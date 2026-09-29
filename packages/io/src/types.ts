import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * One transaction the server recorded on the document the editor saves to,
 * with its patches scoped to the field.
 */
export type Transaction = {
  transactionId: string
  previousRev: string | undefined
  resultRev: string | undefined
  patches: Array<Patch>
}

/**
 * A batch of patches the editor hands to its host to save. `value` is the
 * editor's content when the batch goes out, `undefined` when the field is
 * empty.
 */
export type MutationBatch = {
  id: string
  patches: Array<Patch>
  value: Array<PortableTextBlock> | undefined
  final?: true
}

export type MutationSent = {id: string; transactionId: string}

export type MutationRejected = {id: string}

/**
 * The server's copy of the field and the document revision it is at. `rev`
 * is `undefined` when the document doesn't exist.
 */
export type Load = {
  value: Array<PortableTextBlock> | undefined
  rev: string | undefined
}

/**
 * `outcomes` says, by batch ID, whether a batch the editor sent is in the
 * copy (`'applied'`) or will never be saved (`'not applied'`).
 */
export type Resync = Load & {
  discardUnsent?: true
  outcomes?: Record<string, 'applied' | 'not applied'>
}

export type ErrorEvent = {
  reason: 'out of order' | 'duplicate key' | 'patch failed' | 'echo mismatch'
  transactionId?: string
  patch?: Patch
}

/**
 * The user's own unsent work the editor gave up on: pending changes with no
 * target, or pending changes dropped on close while sending was blocked.
 */
export type WorkDropped = {
  patches: Array<Patch>
  reason: 'no target' | 'closed while blocked'
}

/**
 * The model carries patches as a stand-in for the editor's operations: the
 * action's patches for a local change, and a whole-value `set` for a
 * re-derived screen.
 */
export type ChangeEvent = {
  operations: Array<Patch>
  origin: 'local' | 'remote'
}
