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
 * A batch of patches the editor hands to its host to save. `transactionId`
 * is the transaction ID the editor proposes for saving it: a host that saves
 * the batch as its own request uses it as is, and a host that chooses
 * another names that one with `mutation sent`. The batch carries no value:
 * the patches are the save.
 */
export type MutationBatch = {
  id: string
  transactionId: string
  patches: Array<Patch>
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
 * `operations` carries patches as the model's stand-in for the editor's
 * operations: the action's patches for a local change, and a whole-value
 * `set` for a re-derived screen. A local change's `patches` are the patches
 * that will go into its batch. A remote change has nothing to save, so it
 * carries no `patches`.
 */
export type ChangeEvent =
  | {origin: 'local'; operations: Array<Patch>; patches: Array<Patch>}
  | {origin: 'remote'; operations: Array<Patch>}
