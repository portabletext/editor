import {unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {authorInstructions, lineUpList} from './apply'
import {
  applyWithContentLakeSemantics,
  hasTarget,
  resolvePath,
} from './content-lake'
import {blocksForEditor, isBelowFloor, isObject, repairToFloor} from './floor'
import {childrenOf, isEqual, itemKey, keyOf} from './nodes'
import type {
  EditorForIo,
  ErrorEvent,
  Load,
  Mutation,
  MutationRejected,
  MutationSent,
  Resync,
  Transaction,
  WorkDropped,
} from './types'

const heldTransactionTimeout = 10_000
const livenessTimeout = 10_000

export type Clock = {
  now: () => number
  /** Returns a function that cancels the callback. */
  schedule: (delay: number, callback: () => void) => () => void
}

/** `'loading'` until the editor's `ready`, `'unmounted'` after its `closing`. */
export type IoStatus = 'loading' | 'ready' | 'unmounted'

/**
 * Whether the user's work is saved: `'saving'` while a mutation is in flight or
 * changes are pending, `'blocked'` after a rejection and `'out of step'` after
 * an error or a lost feed, both until the next resync.
 */
export type IoSync = 'synced' | 'saving' | 'blocked' | 'out of step'

export type IoEvent =
  | ({type: 'mutation'} & Mutation)
  | ({type: 'error'} & ErrorEvent)
  | ({type: 'work dropped'} & WorkDropped)
  | {type: 'warning'; message: string}

/**
 * What the host tells io: the first content, a transaction from the feed,
 * what became of a mutation, a lost feed, a fresh copy, and that io is done.
 * `load` is accepted only before the editor's `ready`, and a second `load`
 * replaces the first. `close` does what the editor's `closing` does.
 */
export type IoMessage =
  | ({type: 'load'} & Load)
  | ({type: 'transaction'} & Transaction)
  | ({type: 'mutation sent'} & MutationSent)
  | ({type: 'mutation rejected'} & MutationRejected)
  | {type: 'feed lost'}
  | ({type: 'resync'} & Resync)
  | {type: 'close'}

/**
 * io's state, shaped like the editor's snapshot. `rev` is the base's
 * revision, `inFlight` the mutation in flight with the transaction ID it is
 * saved under, and `pending` how many local changes wait to be sent.
 */
export type IoSnapshot = {
  context: {
    status: IoStatus
    sync: IoSync
    rev: string | undefined
    inFlight: {id: string; transactionId: string} | undefined
    pending: number
  }
}

/**
 * io as a store, shaped like the editor: `getSnapshot` returns the same
 * object until something in it changes, `subscribe` calls `next` after
 * every change, `on` listens to what io tells the host, and `send` takes
 * what the host tells io.
 */
export type Io = {
  getSnapshot: () => IoSnapshot
  subscribe: (
    observer:
      | {
          next?: (snapshot: IoSnapshot) => void
          error?: (error: unknown) => void
          complete?: () => void
        }
      | ((snapshot: IoSnapshot) => void),
  ) => {unsubscribe: () => void}
  on: <TType extends IoEvent['type'] | '*'>(
    type: TType,
    listener: (
      event: IoEvent & (TType extends '*' ? unknown : {type: TType}),
    ) => void,
  ) => {unsubscribe: () => void}
  send: (message: IoMessage) => void
}

/**
 * A mutation the editor has sent and the base doesn't hold yet.
 * `transactionIds` holds the proposed transaction ID until the host names
 * another with `mutation sent`.
 */
export type IoSentMutation = {
  id: string
  transactionIds: Array<string>
  patchCount: number
}

/**
 * The editor's protocol state, for display. `echoed` are mutations whose
 * transaction came back but waits in `held` behind a missing one, and
 * `pending` holds one entry per local change not sent yet.
 */
export type IoLedger = {
  inFlight: IoSentMutation | undefined
  rejected: IoSentMutation | undefined
  echoed: Array<IoSentMutation>
  pending: Array<{patchCount: number; patches: Array<Patch>}>
  held: Array<
    Pick<Transaction, 'transactionId' | 'previousRev' | 'resultRev'> & {
      arrivedAt: number
    }
  >
  outOfStep: boolean
}

/**
 * What io holds beyond its snapshot, for the model's tests, its world and
 * its stand-in for the editor's history. The working copy is the base with
 * the unconfirmed mutations and the pending changes applied, without the
 * blocks that aren't objects: what the editor shows, the placeholder aside.
 * `getLayers` returns the base and what lies on it, in order. `warn` emits
 * a `warning`, and `tap` hears what io is about to do (see `IoTap`).
 */
export type IoInternals = {
  getBase: () => Load
  getWorkingCopy: () => Array<PortableTextBlock> | undefined
  inspect: () => IoLedger
  getLayers: () => {
    base: Array<PortableTextBlock> | undefined
    unconfirmed: Array<{id: string; patches: Array<Patch>}>
    pending: Array<Patch>
  }
  getStatus: () => IoStatus
  warn: (message: string) => void
  tap: (tap: IoTap) => {unsubscribe: () => void}
}

/**
 * Moments io reports to a tap, synchronously, before it acts on them:
 * `localChange` before it books a local change as pending, with the working
 * copy before the change and how many pending patches come before it,
 * `mutation` before it emits a mutation, `transaction` before a transaction
 * moves the base, with the mutations it confirms and the editor's own
 * patches in it, and `resync` once a resync has taken its copy.
 */
export type IoTap = {
  localChange?: (change: {
    operations: Array<Patch>
    workingCopyBefore: Array<PortableTextBlock> | undefined
    patchOffset: number
  }) => void
  mutation?: (id: string) => void
  transaction?: (transaction: {
    confirmedMutationIds: Set<string>
    patches: Array<Patch>
    valueBefore: Array<PortableTextBlock> | undefined
    ownPatches: Array<Patch>
  }) => void
  resync?: () => void
}

const internalsByIo = new WeakMap<Io, IoInternals>()

export function getIoInternals(io: Io): IoInternals {
  const internals = internalsByIo.get(io)

  if (!internals) {
    throw new Error('Not an io made by `createIo`')
  }

  return internals
}

/** `io` with `extension` on top, sharing its internals. */
export function extendIo<TExtension extends object>(
  io: Io,
  extension: TExtension,
): Io & TExtension {
  const extended = {...io, ...extension}

  internalsByIo.set(extended, getIoInternals(io))

  return extended
}

type SentMutation = {
  id: string
  patches: Array<Patch>
  /**
   * The transaction IDs the editor takes for its own: the proposed one until
   * the host names another, then every one the host named.
   */
  transactionIds: Set<string>
  /** Whether the host has sent `mutation sent` for the mutation. */
  named: boolean
}

type HeldTransaction = {transaction: Transaction; arrivedAt: number}

/**
 * The editor side of the pass-through protocol, speaking to the editor only
 * through `EditorForIo`. It is created during the editor's first commit.
 * Mutation IDs are the editor's `id` plus a counter, so editors with different
 * IDs never share one. The transaction ID proposed with each mutation comes
 * from `transactionIdGenerator`, a random UUID by default, since a
 * transaction ID must be unique across every writer of the document, not
 * only among this editor's mutations. `keyGenerator` mints the new keys a resync gives pending
 * inserts whose keys the copy has. Keys io mints to repair a received value
 * come from the value's revision and the repaired node's path instead (see
 * `repairToFloor`).
 */
export function createIo(options: {
  id: string
  editor: EditorForIo
  keyGenerator: () => string
  transactionIdGenerator?: () => string
  clock: Clock
}): Io {
  const {
    editor,
    keyGenerator,
    transactionIdGenerator = randomTransactionId,
    clock,
  } = options
  const listeners = new Set<(event: IoEvent) => void>()
  const observers = new Set<(snapshot: IoSnapshot) => void>()
  const taps = new Set<IoTap>()
  const emittedMutationIds = new Set<string>()

  let status: IoStatus = 'loading'
  let base: Load = {value: undefined, rev: undefined}
  let outOfStep = false
  let mutationCounter = 0
  let inFlight: SentMutation | undefined
  let rejected: SentMutation | undefined
  let echoedAwaitingBase: Array<SentMutation> = []
  let pending: Array<Array<Patch>> = []
  let held: Array<HeldTransaction> = []
  let cancelHeldTimeout: (() => void) | undefined
  let cancelInFlightWarning: (() => void) | undefined
  const droppedPatches = new WeakSet<Patch>()
  let snapshot: IoSnapshot = {context: readContext()}
  let publishedSnapshot = snapshot

  const editorSubscriptions = [
    editor.on('ready', () => {
      becomeReady()
      publish()
    }),
    editor.on('closing', () => {
      close()
      publish()
    }),
    editor.on('change', (event) => {
      if (event.origin === 'local') {
        takeLocalChange(event)
        publish()
      }
    }),
  ]

  function readContext(): IoSnapshot['context'] {
    const transactionId = inFlight
      ? [...inFlight.transactionIds].at(-1)
      : undefined

    return {
      status,
      sync: getSync(),
      rev: base.rev,
      inFlight:
        inFlight && transactionId !== undefined
          ? {id: inFlight.id, transactionId}
          : undefined,
      pending: pending.length,
    }
  }

  function getSnapshot(): IoSnapshot {
    const context = readContext()

    if (!isEqual(context, snapshot.context)) {
      snapshot = {context}
    }

    return snapshot
  }

  function publish() {
    const current = getSnapshot()

    if (current === publishedSnapshot) {
      return
    }

    publishedSnapshot = current

    for (const observer of observers) {
      observer(current)
    }
  }

  function receive(message: IoMessage) {
    switch (message.type) {
      case 'load': {
        const {type: _type, ...incoming} = message
        load(incoming)
        break
      }
      case 'transaction': {
        const {type: _type, ...incoming} = message
        transaction(incoming)
        break
      }
      case 'mutation sent': {
        const {type: _type, ...incoming} = message
        mutationSent(incoming)
        break
      }
      case 'mutation rejected': {
        const {type: _type, ...incoming} = message
        mutationRejected(incoming)
        break
      }
      case 'feed lost':
        feedLost()
        break
      case 'resync': {
        const {type: _type, ...incoming} = message
        resync(incoming)
        break
      }
      case 'close':
        close()
        break
    }

    publish()
  }

  function emit(event: IoEvent) {
    for (const listener of listeners) {
      listener(event)
    }
  }

  function warn(message: string) {
    emit({type: 'warning', message})
  }

  function becomeReady() {
    if (status !== 'loading') {
      return
    }

    status = 'ready'
    flush()
  }

  function load(incoming: Load) {
    if (status === 'unmounted') {
      warn('Ignored a load after the editor unmounted')
      return
    }

    if (status !== 'loading') {
      throw new Error(
        '`load` is only accepted in the first commit, before the editor is ready',
      )
    }

    base = {value: incoming.value, rev: incoming.rev}
    pending = []
    queueFloorRepair(incoming)
    editor.send({type: 'load', value: deriveScreen()})
  }

  function resync(incoming: Resync) {
    if (status === 'unmounted') {
      warn('Ignored a resync after the editor unmounted')
      return
    }

    if (status === 'loading') {
      throw new Error('`resync` is not accepted before the editor is ready')
    }

    if (inFlight && incoming.outcomes?.[inFlight.id] === undefined) {
      warn(
        `Refused a resync while mutation "${inFlight.id}" is in flight: wait until it comes back or is rejected, or say what became of it`,
      )
      return
    }

    const notApplied =
      inFlight && incoming.outcomes?.[inFlight.id] === 'not applied'
        ? inFlight
        : undefined
    const droppedRejected = rejected
    const screenBefore = deriveScreen()

    base = {value: incoming.value, rev: incoming.rev}
    inFlight = undefined
    stopInFlightWarning()
    rejected = undefined
    echoedAwaitingBase = []
    outOfStep = false
    releaseHeld()

    for (const tap of taps) {
      tap.resync?.()
    }

    if (notApplied) {
      pending = [notApplied.patches, ...pending]
    }

    if (incoming.discardUnsent) {
      pending = []
    }

    queueFloorRepair(incoming)
    rekeyPendingInserts(screenBefore)
    editor.send({type: 'resync', value: deriveScreen()})

    if (droppedRejected) {
      emit({
        type: 'work dropped',
        patches: droppedRejected.patches,
        reason: 'rejected',
      })
    }

    reportDroppedPending('the resync')
    flush()
  }

  /**
   * Reports each pending patch that has no target on the screen being built,
   * once. The patches stay pending and go out, as no-ops, with the next mutation.
   */
  function reportDroppedPending(after: string) {
    let value = applyWithContentLakeSemantics(
      base.value,
      unconfirmedMutations().flatMap((mutation) => mutation.patches),
    )
    const dropped: Array<Patch> = []

    for (const patch of pending.flat()) {
      if (!hasTarget(value, patch) && !droppedPatches.has(patch)) {
        droppedPatches.add(patch)
        dropped.push(patch)
      }

      value = applyWithContentLakeSemantics(value, [patch])
    }

    if (dropped.length > 0) {
      warn(
        `${dropped.length} unsent patches had no target after ${after} and did nothing`,
      )
      emit({type: 'work dropped', patches: dropped, reason: 'no target'})
    }
  }

  function transaction(incoming: Transaction) {
    if (status === 'unmounted') {
      warn(
        `Ignored transaction "${incoming.transactionId}" after the editor unmounted`,
      )
      return
    }

    if (status === 'loading') {
      throw new Error(
        '`transaction` is not accepted before the editor is ready',
      )
    }

    const mismatch = outOfStep ? undefined : echoMismatch(incoming)

    noteOwnTransaction(incoming.transactionId)

    if (mismatch) {
      fail({
        reason: 'echo mismatch',
        transactionId: incoming.transactionId,
        patch: mismatch,
      })
    }

    if (outOfStep) {
      flush()
      return
    }

    if (incoming.previousRev !== base.rev) {
      held = [...held, {transaction: incoming, arrivedAt: clock.now()}]
      scheduleHeldTimeout()
      flush()
      return
    }

    let next: Transaction | undefined = incoming

    while (next && applyTransaction(next)) {
      next = takeConnectedHeldTransaction()
    }

    scheduleHeldTimeout()
    flush()
  }

  /**
   * A `set` or `unset` in the editor's own echo that the editor didn't send,
   * above a path its mutation touched: the host widened the mutation. Other patches
   * can't overwrite the mutation's work, and patches at the same path or
   * elsewhere can be other writers' mutations folded into the same transaction.
   */
  function echoMismatch(incoming: Transaction): Patch | undefined {
    if (!inFlight?.transactionIds.has(incoming.transactionId)) {
      return undefined
    }

    const sentPatches = inFlight.patches

    return incoming.patches.find(
      (patch) =>
        (patch.type === 'set' || patch.type === 'unset') &&
        !sentPatches.some((sentPatch) => isEqual(sentPatch, patch)) &&
        sentPatches.some((sentPatch) =>
          isAncestorPath(patch.path, sentPatch.path),
        ),
    )
  }

  function noteOwnTransaction(transactionId: string) {
    if (inFlight?.transactionIds.has(transactionId)) {
      echoedAwaitingBase = [...echoedAwaitingBase, inFlight]
      inFlight = undefined
      stopInFlightWarning()
    }
  }

  function takeConnectedHeldTransaction(): Transaction | undefined {
    const connected = held.find(
      (candidate) => candidate.transaction.previousRev === base.rev,
    )

    if (!connected) {
      return undefined
    }

    held = held.filter((candidate) => candidate !== connected)

    return connected.transaction
  }

  function applyTransaction(incoming: Transaction): boolean {
    const confirmedMutationIds = new Set(
      echoedAwaitingBase
        .filter((mutation) =>
          mutation.transactionIds.has(incoming.transactionId),
        )
        .map((mutation) => mutation.id),
    )
    let nextValue = base.value

    for (const patch of incoming.patches) {
      if (
        patch.type === 'insert' &&
        insertCollides(patch, keysAmongSiblings(nextValue, patch.path))
      ) {
        return fail({
          reason: 'duplicate key',
          transactionId: incoming.transactionId,
          patch,
        })
      }

      try {
        nextValue = applyWithContentLakeSemantics(nextValue, [patch])
      } catch {
        return fail({
          reason: 'patch failed',
          transactionId: incoming.transactionId,
          patch,
        })
      }
    }

    const valueFromPatches = nextValue

    if ('value' in incoming) {
      nextValue = incoming.value
    }

    if (touchedBlocks(base.value, nextValue).some(isBelowFloor)) {
      return fail({
        reason: 'invalid content',
        transactionId: incoming.transactionId,
      })
    }

    const unconfirmedLists = insertedKeysByList(
      [
        ...echoedAwaitingBase.filter(
          (mutation) => !confirmedMutationIds.has(mutation.id),
        ),
        ...(inFlight ? [inFlight] : []),
        ...(rejected ? [rejected] : []),
      ].flatMap((mutation) => mutation.patches),
    )
    const unconfirmedCollision = incoming.patches.find(
      (patch) =>
        patch.type === 'insert' &&
        insertCollides(
          patch,
          unconfirmedLists.get(listId(patch.path.slice(0, -1)))?.keys ??
            new Set(),
        ),
    )
    const collision = unconfirmedCollision
      ? {patch: unconfirmedCollision}
      : pendingKeyCollision(incoming.patches, nextValue)

    if (collision) {
      return fail({
        reason: 'duplicate key',
        transactionId: incoming.transactionId,
        ...collision,
      })
    }

    const screenBefore = deriveScreen()
    const valueBefore = base.value
    const ownPatches = echoedAwaitingBase
      .filter((mutation) => confirmedMutationIds.has(mutation.id))
      .flatMap((mutation) => mutation.patches)
    const unconfirmedPatches = unconfirmedMutations().flatMap(
      (mutation) => mutation.patches,
    )

    for (const tap of taps) {
      tap.transaction?.({
        confirmedMutationIds,
        patches: incoming.patches,
        valueBefore,
        ownPatches,
      })
    }

    base = {value: nextValue, rev: incoming.resultRev}
    echoedAwaitingBase = echoedAwaitingBase.filter(
      (mutation) => !confirmedMutationIds.has(mutation.id),
    )

    if (incoming.patches.length > 0 || !isEqual(valueBefore, nextValue)) {
      applyToEditor({
        screenBefore,
        underneath: incoming.patches,
        ownPatches,
        unconfirmedPatches,
        valueBefore,
        valueFromPatches,
      })
      reportDroppedPending(`transaction "${incoming.transactionId}"`)
    }

    return true
  }

  /**
   * Whether `nextBase`, the base the transaction selects (from its `value`
   * or its patches), has a key in a list (the block list or a block's
   * `children`) that a pending insert into that list also inserts and the
   * list didn't have before, with the first of `patches` after which it
   * does, if any does. Applied work is never re-keyed in place: the resync
   * re-keys the pending insert.
   */
  function pendingKeyCollision(
    patches: Array<Patch>,
    nextBase: Array<PortableTextBlock> | undefined,
  ): {patch?: Patch} | undefined {
    const pendingLists = [...insertedKeysByList(pending.flat()).values()]
    const keysBefore = pendingLists.map(
      ({listPath}) => new Set(keysInList(base.value, listPath)),
    )
    const takesPendingKey = (value: Array<PortableTextBlock> | undefined) =>
      pendingLists.some(({listPath, keys}, index) =>
        keysInList(value, listPath).some(
          (key) => keys.has(key) && !keysBefore[index].has(key),
        ),
      )

    if (!takesPendingKey(nextBase)) {
      return undefined
    }

    let value = base.value

    for (const patch of patches) {
      value = applyWithContentLakeSemantics(value, [patch])

      if (takesPendingKey(value)) {
        return {patch}
      }
    }

    return {}
  }

  function fail(error: ErrorEvent): false {
    outOfStep = true
    releaseHeld()
    emit({type: 'error', ...error})
    return false
  }

  function scheduleHeldTimeout() {
    cancelHeldTimeout?.()
    cancelHeldTimeout = undefined

    const [oldest] = held

    if (!oldest) {
      return
    }

    cancelHeldTimeout = clock.schedule(
      oldest.arrivedAt + heldTransactionTimeout - clock.now(),
      () => {
        cancelHeldTimeout = undefined
        fail({
          reason: 'out of order',
          transactionId: oldest.transaction.transactionId,
        })
        publish()
      },
    )
  }

  function releaseHeld() {
    held = []
    scheduleHeldTimeout()
  }

  function mutationSent(incoming: MutationSent) {
    if (!emittedMutationIds.has(incoming.id)) {
      warn(`\`mutation sent\` for unknown mutation "${incoming.id}"`)
      return
    }

    if (inFlight?.id !== incoming.id) {
      return
    }

    if (!inFlight.named) {
      inFlight = {
        ...inFlight,
        transactionIds: new Set([incoming.transactionId]),
        named: true,
      }
      return
    }

    if (!inFlight.transactionIds.has(incoming.transactionId)) {
      warn(
        `\`mutation sent\` names transaction "${incoming.transactionId}" for mutation "${incoming.id}", already sent as ${[
          ...inFlight.transactionIds,
        ]
          .map((transactionId) => `"${transactionId}"`)
          .join(', ')}: a retry must reuse the transaction ID`,
      )
      inFlight = {
        ...inFlight,
        transactionIds: new Set([
          ...inFlight.transactionIds,
          incoming.transactionId,
        ]),
      }
    }
  }

  function feedLost() {
    if (status === 'unmounted') {
      warn('Ignored `feed lost` after the editor unmounted')
      return
    }

    if (status === 'loading') {
      throw new Error('`feed lost` is not accepted before the editor is ready')
    }

    outOfStep = true
    releaseHeld()
    warn('The feed was lost: applying no more transactions until a resync')
  }

  function mutationRejected(incoming: MutationRejected) {
    if (!emittedMutationIds.has(incoming.id)) {
      warn(`\`mutation rejected\` for unknown mutation "${incoming.id}"`)
      return
    }

    if (inFlight?.id !== incoming.id) {
      warn(`\`mutation rejected\` for mutation "${incoming.id}", not in flight`)
      return
    }

    rejected = inFlight
    inFlight = undefined
    stopInFlightWarning()
  }

  /** Books a local change as pending. */
  function takeLocalChange({
    operations,
    patches,
  }: {
    operations: Array<Patch>
    patches: Array<Patch>
  }) {
    if (status !== 'ready' || patches.length === 0) {
      return
    }

    for (const tap of taps) {
      tap.localChange?.({
        operations,
        workingCopyBefore: deriveScreen(),
        patchOffset: pending.flat().length,
      })
    }

    pending = [...pending, keepingStoredNonObjects(patches)]
    flush()
  }

  /**
   * The editor empties its field with a whole-field `unset`, which would
   * also remove the stored blocks that aren't objects, though the editor
   * never had them. While the working copy holds any, each whole-field
   * `unset` becomes keyed `unset`s of the blocks that are objects there.
   */
  function keepingStoredNonObjects(patches: Array<Patch>): Array<Patch> {
    let value = applyWithContentLakeSemantics(base.value, [
      ...unconfirmedMutations().flatMap((mutation) => mutation.patches),
      ...pending.flat(),
    ])

    if (!(value ?? []).some((block) => !isObject(block))) {
      return patches
    }

    return patches.flatMap((patch) => {
      const kept =
        patch.type === 'unset' && patch.path.length === 0
          ? blocksForEditor(value ?? []).blocks.flatMap((block) =>
              itemKey(block).map((key) => unset([{_key: key}])),
            )
          : [patch]

      value = applyWithContentLakeSemantics(value, kept)

      return kept
    })
  }

  function close() {
    if (status === 'unmounted') {
      return
    }

    if (pending.length > 0) {
      if (outOfStep) {
        warn(
          `${pending.length} unsent change(s) dropped on close: the editor is out of step`,
        )
        emit({
          type: 'work dropped',
          patches: pending.flat(),
          reason: 'closed out of step',
        })
        pending = []
      } else if (rejected) {
        warn(
          `${pending.length} unsent change(s) dropped on close: sending was blocked by the rejection of mutation ${rejected.id}`,
        )
        emit({
          type: 'work dropped',
          patches: pending.flat(),
          reason: 'closed while blocked',
        })
        pending = []
      } else {
        emitMutation({final: true})
      }
    }

    status = 'unmounted'
    releaseHeld()
    stopInFlightWarning()

    for (const subscription of editorSubscriptions) {
      subscription.unsubscribe()
    }
  }

  function flush() {
    if (
      status !== 'ready' ||
      outOfStep ||
      inFlight ||
      rejected ||
      pending.length === 0
    ) {
      return
    }

    emitMutation({final: false})
  }

  function emitMutation({final}: {final: boolean}) {
    mutationCounter++

    const mutation: Mutation = {
      id: `${options.id}-${mutationCounter}`,
      transactionId: transactionIdGenerator(),
      patches: pending.flat(),
      ...(final ? {final: true as const} : {}),
    }

    pending = []
    emittedMutationIds.add(mutation.id)

    for (const tap of taps) {
      tap.mutation?.(mutation.id)
    }

    if (!final) {
      inFlight = {
        id: mutation.id,
        patches: mutation.patches,
        transactionIds: new Set([mutation.transactionId]),
        named: false,
      }
      startInFlightWarning(mutation.id, livenessTimeout, clock.now())
    }

    emit({type: 'mutation', ...mutation})
  }

  function startInFlightWarning(
    mutationId: string,
    delay: number,
    since: number,
  ) {
    cancelInFlightWarning = clock.schedule(delay, () => {
      warn(
        `Mutation "${mutationId}" has been in flight for ${clock.now() - since} ms without coming back`,
      )
      startInFlightWarning(mutationId, delay * 2, since)
    })
  }

  function stopInFlightWarning() {
    cancelInFlightWarning?.()
    cancelInFlightWarning = undefined
  }

  /**
   * Sends the editor a transaction's effect as keyed instructions for its
   * tree, authored from the working copy before and after the transaction.
   * The editor's own patches in the transaction are already on screen. Work
   * that was unconfirmed when the transaction arrived, `unconfirmedPatches`
   * and the pending changes, decides how the rest arrive (see
   * `authorInstructions`). A transaction that left the working copy as it
   * was goes out with no `patches`: its `underneath` is what the editor's
   * history needs, since a remote change under a local one shows nowhere on
   * screen. The instructions are authored against the working copy over
   * `valueFromPatches`, the base the patches alone make, so a transaction
   * with `value` gets the same instructions as one without. A base taken
   * from the transaction's `value` can differ from that in ways the patches
   * don't say, and that difference is lined up after them.
   */
  function applyToEditor({
    screenBefore,
    underneath,
    ownPatches,
    unconfirmedPatches,
    valueBefore,
    valueFromPatches,
  }: {
    screenBefore: Array<PortableTextBlock> | undefined
    underneath: Array<Patch>
    ownPatches: Array<Patch>
    unconfirmedPatches: Array<Patch>
    valueBefore: Array<PortableTextBlock> | undefined
    valueFromPatches: Array<PortableTextBlock> | undefined
  }) {
    const screen = deriveScreen()

    if (isEqual(screenBefore, screen)) {
      editor.send({type: 'apply', patches: [], underneath})
      return
    }

    const screenFromPatches = deriveScreen(valueFromPatches)
    const instructions = authorInstructions({
      stored: valueBefore,
      shown: screenBefore,
      wanted: screenFromPatches,
      patches: withoutPatches(underneath, ownPatches),
      unlanded: [...unconfirmedPatches, ...pending.flat()],
    })

    editor.send({
      type: 'apply',
      patches: isEqual(screenFromPatches, screen)
        ? instructions
        : [
            ...instructions,
            ...lineUpList(screenFromPatches ?? [], screen ?? [], []),
          ],
      underneath,
    })
  }

  function deriveScreen(
    baseValue: Array<PortableTextBlock> | undefined = base.value,
  ): Array<PortableTextBlock> | undefined {
    const workingCopy = applyWithContentLakeSemantics(baseValue, [
      ...unconfirmedMutations().flatMap((mutation) => mutation.patches),
      ...pending.flat(),
    ])

    return workingCopy === undefined
      ? undefined
      : blocksForEditor(workingCopy).blocks
  }

  /** Sent mutations the base doesn't hold yet, in the order they were sent. */
  function unconfirmedMutations(): Array<SentMutation> {
    return [
      ...echoedAwaitingBase,
      ...(inFlight ? [inFlight] : []),
      ...(rejected ? [rejected] : []),
    ]
  }

  /**
   * Gives each pending insert whose key its list in the base has a new key,
   * in its later patches too. Only a resync does this.
   */
  function rekeyPendingInserts(
    screenBefore: Array<PortableTextBlock> | undefined,
  ) {
    const pendingLists = [...insertedKeysByList(pending.flat()).values()]
    const takenKeys = new Set([
      ...keysInValue(base.value),
      ...keysInValue(screenBefore),
      ...pendingLists.flatMap(({keys}) => [...keys]),
    ])
    const renames = pendingLists.flatMap(({listPath, keys}) => {
      const keysThere = new Set(keysInList(base.value, listPath))
      const newKeys = new Map<string, string>()

      for (const key of keys) {
        if (keysThere.has(key)) {
          newKeys.set(key, generateUniqueKey(keyGenerator, takenKeys))
        }
      }

      return newKeys.size > 0 ? [{listPath, newKeys}] : []
    })

    if (renames.length === 0) {
      return
    }

    const childListsFirst = renames.toSorted(
      (renameA, renameB) => renameB.listPath.length - renameA.listPath.length,
    )

    pending = pending.map((patches) =>
      patches.map((patch) => {
        const renamed = childListsFirst.reduce(renameKeys, patch)

        if (droppedPatches.has(patch)) {
          droppedPatches.add(renamed)
        }

        return renamed
      }),
    )
  }

  function queueFloorRepair(incoming: Load) {
    const repairPatches = repairToFloor(incoming)
    const leftOutCount =
      (incoming.value ?? []).length -
      blocksForEditor(incoming.value ?? []).blocks.length

    if (leftOutCount > 0) {
      warn(`Left out ${leftOutCount} blocks that are not objects`)
    }

    if (repairPatches.length > 0) {
      warn(
        `Repaired ${repairPatches.length} places below the floor or with missing or duplicate keys`,
      )
      pending = [repairPatches, ...pending]
    }
  }

  function getSync(): IoSync {
    if (outOfStep) {
      return 'out of step'
    }

    if (rejected) {
      return 'blocked'
    }

    return inFlight || pending.length > 0 ? 'saving' : 'synced'
  }

  const io: Io = {
    getSnapshot,
    subscribe: (observer) => {
      const next =
        typeof observer === 'function'
          ? observer
          : observer.next?.bind(observer)
      const callNext = (current: IoSnapshot) => next?.(current)

      observers.add(callNext)

      return {
        unsubscribe: () => {
          observers.delete(callNext)
        },
      }
    },
    on: (type, listener) => {
      const listenToType = (event: IoEvent) => {
        if (isOfType(event, type)) {
          listener(event)
        }
      }

      listeners.add(listenToType)

      return {
        unsubscribe: () => {
          listeners.delete(listenToType)
        },
      }
    },
    send: receive,
  }

  internalsByIo.set(io, {
    getBase: () => base,
    getWorkingCopy: () => deriveScreen(),
    inspect: () => ({
      inFlight: inFlight ? describeSentMutation(inFlight) : undefined,
      rejected: rejected ? describeSentMutation(rejected) : undefined,
      echoed: echoedAwaitingBase.map(describeSentMutation),
      pending: pending.map((patches) => ({
        patchCount: patches.length,
        patches,
      })),
      held: held.map(({transaction, arrivedAt}) => ({
        transactionId: transaction.transactionId,
        previousRev: transaction.previousRev,
        resultRev: transaction.resultRev,
        arrivedAt,
      })),
      outOfStep,
    }),
    getLayers: () => ({
      base: base.value,
      unconfirmed: unconfirmedMutations().map(({id, patches}) => ({
        id,
        patches,
      })),
      pending: pending.flat(),
    }),
    getStatus: () => status,
    warn,
    tap: (tap) => {
      taps.add(tap)

      return {
        unsubscribe: () => {
          taps.delete(tap)
        },
      }
    },
  })

  return io
}

/**
 * A version 4 UUID, from `crypto.randomUUID` where the runtime has it and
 * from `Math.random` otherwise.
 */
function randomTransactionId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (digit) => {
    const random = Math.floor(Math.random() * 16)

    return (digit === 'x' ? random : (random % 4) + 8).toString(16)
  })
}

function isOfType<TType extends IoEvent['type'] | '*'>(
  event: IoEvent,
  type: TType,
): event is IoEvent & (TType extends '*' ? unknown : {type: TType}) {
  return type === '*' || event.type === type
}

function describeSentMutation(mutation: SentMutation): IoSentMutation {
  return {
    id: mutation.id,
    transactionIds: [...mutation.transactionIds],
    patchCount: mutation.patches.length,
  }
}

/**
 * Calls the key generator until it returns a key that isn't taken, and marks
 * that key as taken.
 */
function generateUniqueKey(
  keyGenerator: () => string,
  takenKeys: Set<string>,
): string {
  let key = keyGenerator()

  while (takenKeys.has(key)) {
    key = keyGenerator()
  }

  takenKeys.add(key)

  return key
}

/**
 * `patches` without `removed`, each removed patch matching one equal patch.
 */
function withoutPatches(
  patches: Array<Patch>,
  removed: Array<Patch>,
): Array<Patch> {
  const unmatched = [...removed]

  return patches.filter((patch) => {
    const index = unmatched.findIndex((candidate) => isEqual(candidate, patch))

    if (index === -1) {
      return true
    }

    unmatched.splice(index, 1)

    return false
  })
}

/**
 * The blocks of `after` that `before` has no equal of, each block of
 * `before` matching one equal block of `after`.
 */
function touchedBlocks(
  before: Array<PortableTextBlock> | undefined,
  after: Array<PortableTextBlock> | undefined,
): Array<PortableTextBlock> {
  const unmatched = [...(before ?? [])]

  return (after ?? []).filter((block) => {
    const index = unmatched.findIndex((candidate) => isEqual(candidate, block))

    if (index === -1) {
      return true
    }

    unmatched.splice(index, 1)

    return false
  })
}

/** Whether `ancestor` is a strict prefix of `path`. */
function isAncestorPath(ancestor: Patch['path'], path: Patch['path']): boolean {
  return (
    ancestor.length < path.length &&
    ancestor.every((segment, index) => isEqual(segment, path[index]))
  )
}

function keysAmongSiblings(
  value: Array<PortableTextBlock> | undefined,
  path: Patch['path'],
): Set<string> {
  const siblings = resolvePath(value, path.slice(0, -1))

  return new Set(
    Array.isArray(siblings) ? siblings.flatMap((item) => itemKey(item)) : [],
  )
}

/**
 * Whether an insert brings a key that is already taken, or brings the same
 * key twice.
 */
function insertCollides(patch: Patch, keys: Set<string>): boolean {
  if (patch.type !== 'insert') {
    return false
  }

  const insertedKeys = patch.items.flatMap((item) => itemKey(item))

  return (
    new Set(insertedKeys).size < insertedKeys.length ||
    insertedKeys.some((key) => keys.has(key))
  )
}

/**
 * The keys `patches` insert, by the list they insert into (the block list,
 * or a block's `children`), keyed by `listId`.
 */
function insertedKeysByList(
  patches: Array<Patch>,
): Map<string, {listPath: Patch['path']; keys: Set<string>}> {
  const lists = new Map<string, {listPath: Patch['path']; keys: Set<string>}>()

  for (const patch of patches) {
    if (patch.type !== 'insert') {
      continue
    }

    const listPath = patch.path.slice(0, -1)
    const list = lists.get(listId(listPath)) ?? {listPath, keys: new Set()}

    for (const item of patch.items) {
      for (const key of itemKey(item)) {
        list.keys.add(key)
      }
    }

    lists.set(listId(listPath), list)
  }

  return lists
}

function listId(listPath: Patch['path']): string {
  return JSON.stringify(listPath)
}

function keysInList(
  value: Array<PortableTextBlock> | undefined,
  listPath: Patch['path'],
): Array<string> {
  const list = resolvePath(value, listPath)

  return Array.isArray(list) ? list.flatMap((item) => itemKey(item)) : []
}

/** Every key of the blocks and their children. */
function keysInValue(
  value: Array<PortableTextBlock> | undefined,
): Array<string> {
  return (value ?? []).flatMap((block) =>
    isObject(block)
      ? [
          ...itemKey(block),
          ...childrenOf(block).flatMap((child) => itemKey(child)),
        ]
      : [],
  )
}

/**
 * Renames the keys of `newKeys` in the list at `listPath`: in the items an
 * insert into the list brings, and in a path through one of its items.
 */
function renameKeys(
  patch: Patch,
  {listPath, newKeys}: {listPath: Patch['path']; newKeys: Map<string, string>},
): Patch {
  const depth = listPath.length
  const inList =
    patch.path.length > depth &&
    listPath.every((segment, index) => isEqual(segment, patch.path[index]))
  const itemSegmentKey = inList ? keyOf(patch.path[depth]) : undefined
  const renamedPath =
    itemSegmentKey !== undefined && newKeys.has(itemSegmentKey)
      ? [
          ...patch.path.slice(0, depth),
          {_key: newKeys.get(itemSegmentKey) ?? itemSegmentKey},
          ...patch.path.slice(depth + 1),
        ]
      : patch.path

  if (patch.type === 'insert' && inList && patch.path.length === depth + 1) {
    return {
      ...patch,
      path: renamedPath,
      items: patch.items.map((item) => {
        const [key] = itemKey(item)

        return key !== undefined && newKeys.has(key) && isObject(item)
          ? {...item, _key: newKeys.get(key) ?? key}
          : item
      }),
    }
  }

  return {...patch, path: renamedPath}
}
