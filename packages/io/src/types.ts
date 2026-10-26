import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * What the host tells io. `load` is the server's copy before the editor is
 * ready, and `resync` a fresh copy after that. `transaction` is one
 * transaction from the document's listener, own echoes included.
 * `mutation sent` names the transaction a mutation was saved under, when
 * the host chose another than the one io proposed, and
 * `mutation rejected` says the server refused it for good. `resync` must
 * say, in `outcomes`, whether the mutation in flight is in the copy
 * (`'applied'`) or was never saved (`'not applied'`).
 *
 * @public
 */
export type IoMessage =
  | {
      type: 'load'
      value: Array<PortableTextBlock> | undefined
      rev: string | undefined
    }
  | {
      type: 'transaction'
      transactionId: string
      previousRev: string | undefined
      resultRev: string
      patches: Array<Patch>
    }
  | {type: 'mutation sent'; id: string; transactionId: string}
  | {type: 'mutation rejected'; id: string}
  | {type: 'feed lost'}
  | {
      type: 'resync'
      value: Array<PortableTextBlock> | undefined
      rev: string | undefined
      outcomes?: Record<string, 'applied' | 'not applied'>
    }
  | {type: 'close'}

/**
 * What io tells the host. `mutation` is the patches to save, as one
 * transaction under `transactionId`, and `final` marks the last one,
 * handed over on close. `work dropped` is the user's own work io gave up on, each
 * patch reported once.
 *
 * @public
 */
export type IoEvent =
  | {
      type: 'mutation'
      id: string
      transactionId: string
      patches: Array<Patch>
      final?: true
    }
  | {
      type: 'work dropped'
      patches: Array<Patch>
      reason: 'no target' | 'rejected'
    }

/**
 * Why io no longer knows the server's copy: a missing transaction that did
 * not arrive in time (`'gap'`), a lost listener (`'feed lost'`), a
 * transaction that could not be applied (`'patch failed'`), or an own
 * mutation that came back with other patches (`'echo mismatch'`).
 *
 * @public
 */
export type IoOutOfStep = {
  reason: 'gap' | 'feed lost' | 'patch failed' | 'echo mismatch'
}

/**
 * @public
 */
export type IoStateValue =
  | 'loading'
  | {ready: 'synced' | 'saving' | 'out of step'}
  | 'closed'

/**
 * @public
 */
export type IoSnapshot = {
  value: IoStateValue
  matches: (state: IoStateValue | 'ready') => boolean
  context: {
    rev: string | undefined
    inFlight: {id: string; transactionId: string} | undefined
    pending: number
    outOfStep?: IoOutOfStep
  }
}

/**
 * @public
 */
export type Io = {
  send: (message: IoMessage) => void
  on: <TType extends IoEvent['type']>(
    type: TType,
    listener: (event: IoEvent & {type: TType}) => void,
  ) => {unsubscribe: () => void}
  getSnapshot: () => IoSnapshot
  subscribe: (listener: (snapshot: IoSnapshot) => void) => {
    unsubscribe: () => void
  }
}

/**
 * The whole of what io uses from an editor. A structural type: adapters
 * implement it on top of an editor.
 *
 * @public
 */
export type EditorForIo = {
  on: <TType extends EditorEventForIo['type']>(
    type: TType,
    listener: (event: EditorEventForIo & {type: TType}) => void,
  ) => {unsubscribe: () => void}
  send: (message: EditorMessageForIo) => void
}

/**
 * `change` is one local edit with the patches to save, emitted
 * synchronously and never for content io gave the editor. `ready` fires
 * once the editor shows the loaded value, and `closed` when it stops.
 *
 * @public
 */
export type EditorEventForIo =
  | {type: 'change'; patches: Array<Patch>}
  | {type: 'ready'}
  | {type: 'closed'}

/**
 * `load` is the first content and `resync` a fresh copy, both whole
 * values. `apply` is another writer's change, as the smallest keyed change
 * to what the editor shows, with text inside a span as a
 * `diffMatchPatch`.
 *
 * @public
 */
export type EditorMessageForIo =
  | {type: 'load'; value: Array<PortableTextBlock> | undefined}
  | {type: 'resync'; value: Array<PortableTextBlock> | undefined}
  | {type: 'apply'; patches: Array<Patch>}
