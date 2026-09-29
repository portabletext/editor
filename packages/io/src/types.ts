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

export type MutationAccepted = {id: string}

/**
 * The server's copy of the field and the document revision it is at. `rev`
 * is `undefined` when the document doesn't exist.
 */
export type Load = {
  value: Array<PortableTextBlock> | undefined
  rev: string | undefined
}

export type Resync = Load & {discardUnsent?: true}

export type ErrorEvent = {
  reason: 'out of order' | 'duplicate key' | 'patch failed'
  transactionId?: string
  patch?: Patch
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
