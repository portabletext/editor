import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * One transaction the server recorded on the document the editor saves to,
 * with its patches scoped to the field. `value`, when present, is the field
 * as the server holds it after the transaction, from the listener's result:
 * the editor takes it as its base instead of applying `patches` to the old
 * one. `patches` still travel, for the editor's tree, `change` and the echo
 * check.
 */
export type Transaction = {
  transactionId: string
  previousRev: string | undefined
  resultRev: string | undefined
  patches: Array<Patch>
  value?: Array<PortableTextBlock> | undefined
}

/**
 * The patches the editor hands to its host to save, as one mutation, with
 * the mutation ID `id`. `transactionId` is the transaction ID the editor
 * proposes for saving it: a host that saves the mutation as its own request
 * uses it as is, and a host that chooses another names that one with
 * `mutation sent`. The mutation carries no value: the patches are the save.
 */
export type Mutation = {
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
 * `outcomes` says, by mutation ID, whether a mutation the editor sent is in the
 * copy (`'applied'`) or was never saved (`'not applied'`). A mutation not
 * applied rejoins the pending changes, ahead of the rest.
 */
export type Resync = Load & {
  discardUnsent?: true
  outcomes?: Record<string, 'applied' | 'not applied'>
}

export type ErrorEvent = {
  reason:
    | 'out of order'
    | 'duplicate key'
    | 'patch failed'
    | 'echo mismatch'
    | 'invalid content'
  transactionId?: string
  patch?: Patch
}

/**
 * The user's own work the editor gave up on: pending changes with no
 * target, the editor's own patches that came back in its echo with no
 * target in the base right before they applied (the server applied them as
 * no-ops), pending changes dropped on close while sending was blocked or
 * the editor was out of step, or the rejected mutation a resync dropped.
 * Each patch is reported once.
 */
export type WorkDropped = {
  patches: Array<Patch>
  reason:
    | 'no target'
    | 'closed while blocked'
    | 'closed out of step'
    | 'rejected'
}

/**
 * `operations` carries patches as the model's stand-in for the editor's
 * operations: the action's patches for a local change, and a whole-value
 * `set` for a re-derived screen. A local change's `patches` are the patches
 * that will go into its mutation, save that io turns a whole-field `unset`
 * into keyed `unset`s while the stored field holds blocks that aren't
 * objects. A remote change has nothing to save, so it carries no
 * `patches`.
 */
export type ChangeEvent =
  | {origin: 'local'; operations: Array<Patch>; patches: Array<Patch>}
  | {origin: 'remote'; operations: Array<Patch>}

/**
 * The whole of what io uses from an editor: it listens to `change`, `ready`
 * and `closing`, and sends `load`, `resync` and `apply`. A structural type,
 * shaped like the editor's own `on` (one event type per listener, answered
 * with an `unsubscribe`) and `send`.
 */
export type EditorForIo = {
  on: <TType extends EditorEventForIo['type']>(
    type: TType,
    listener: (event: EditorEventForIo & {type: TType}) => void,
  ) => {unsubscribe: () => void}
  send: (message: EditorMessageForIo) => void
}

/**
 * `change` fires once per user action and once per `resync` or `apply` that
 * changed the content. `ready` fires at the end of the first commit, and
 * `closing` just before the editor stops: the last moment to send.
 */
export type EditorEventForIo =
  | {
      type: 'change'
      origin: 'local'
      operations: Array<Patch>
      patches: Array<Patch>
    }
  | {type: 'change'; origin: 'remote'; operations: Array<Patch>}
  | {type: 'ready'}
  | {type: 'closing'}

/**
 * `load` is the first content, accepted only during the first commit, and
 * `resync` a fresh copy: both are whole values, matched to the tree by key.
 * `apply` is one transaction's effect on the content: `patches` is what to
 * do to the tree, keyed instructions io authors from its working copy, and
 * `underneath` is the transaction's patches, for history. The editor's own
 * patches in the transaction are left out, another writer's patch on a
 * place the editor's unsaved work didn't touch comes as it is, and a block
 * both touched comes as a `set` of the block. A list the transaction
 * inserted into, removed from or re-keyed comes lined up key by key when
 * the editor's unsaved work touched it too, and always when a key changed.
 * A transaction that moved the base and left the screen as it was comes
 * with no `patches`, so its `underneath` still reaches the editor's
 * history.
 */
export type EditorMessageForIo =
  | {type: 'load'; value: Array<PortableTextBlock> | undefined}
  | {type: 'resync'; value: Array<PortableTextBlock> | undefined}
  | {type: 'apply'; patches: Array<Patch>; underneath: Array<Patch>}
