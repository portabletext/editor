import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  applyWithContentLakeSemantics,
  hasTarget,
  resolvePath,
} from './content-lake'
import type {
  EditorForIo,
  ErrorEvent,
  Load,
  MutationBatch,
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
 * Whether the user's work is saved: `'saving'` while a batch is in flight or
 * changes are pending, `'blocked'` after a rejection and `'out of step'` after
 * an error or a lost feed, both until the next resync.
 */
export type IoSync = 'synced' | 'saving' | 'blocked' | 'out of step'

export type IoEvent =
  | ({type: 'mutation'} & MutationBatch)
  | ({type: 'error'} & ErrorEvent)
  | ({type: 'work dropped'} & WorkDropped)
  | {type: 'warning'; message: string}

/**
 * A batch the editor has sent and the base doesn't hold yet.
 * `transactionIds` holds the proposed transaction ID until the host names
 * another with `mutation sent`.
 */
export type IoSentBatch = {
  id: string
  transactionIds: Array<string>
  patchCount: number
}

/**
 * The editor's protocol state, for display. `echoed` are batches whose
 * transaction came back but waits in `held` behind a missing one, and
 * `pending` holds one entry per local change not sent yet.
 */
export type IoLedger = {
  inFlight: IoSentBatch | undefined
  rejected: IoSentBatch | undefined
  echoed: Array<IoSentBatch>
  pending: Array<{patchCount: number; patches: Array<Patch>}>
  held: Array<
    Pick<Transaction, 'transactionId' | 'previousRev' | 'resultRev'> & {
      arrivedAt: number
    }
  >
  outOfStep: boolean
  /** How many of the editor's own changes undo can still revert. */
  undoDepth: number
}

export type Io = {
  getStatus: () => IoStatus
  getSync: () => IoSync
  getBase: () => Load
  inspect: () => IoLedger
  on: (listener: (event: IoEvent) => void) => () => void

  /**
   * The first content, accepted only before the editor's `ready`. A second
   * `load` replaces the first.
   */
  load: (load: Load) => void
  resync: (resync: Resync) => void
  transaction: (transaction: Transaction) => void
  mutationSent: (mutationSent: MutationSent) => void
  mutationRejected: (mutationRejected: MutationRejected) => void
  feedLost: () => void
  /**
   * Reverts the last of the editor's own changes that undo can still revert,
   * and has the editor apply the revert as a local change. The undo ledger
   * lives here, driven by the editor's local changes and the transactions,
   * until the editor's own history is designed.
   */
  undo: () => void
}

type SentBatch = {
  id: string
  patches: Array<Patch>
  /**
   * The transaction IDs the editor takes for its own: the proposed one until
   * the host names another, then every one the host named.
   */
  transactionIds: Set<string>
  /** Whether the host has sent `mutation sent` for the batch. */
  named: boolean
}

type HeldTransaction = {transaction: Transaction; arrivedAt: number}

/**
 * What a local change did, in terms undo can check against the working copy
 * at undo time: text typed into a span at an offset, a block's style set, a
 * block inserted, or a block deleted next to its siblings. Creating the
 * block from the placeholder isn't part of the step.
 */
type UndoStep =
  | {
      type: 'typed'
      blockKey: string
      spanKey: string
      offset: number
      text: string
    }
  | {type: 'styled'; blockKey: string; style: string}
  | {type: 'inserted'; blockKey: string}
  | {
      type: 'deleted'
      block: PortableTextBlock
      previousKey: string | undefined
      nextKey: string | undefined
    }

/** A block's style, or `undefined` when there is no such block. */
type BlockStyle = {style: string | undefined} | undefined

const placeholderStyle: BlockStyle = {style: 'normal'}

type HistoryEntry = {
  step: UndoStep
  batchId: string | undefined
  /** How many patches of the entry's batch come before the action's own. */
  patchOffset: number
  /**
   * The base's version of the step's block just before the change took
   * effect there, captured when the change's transaction applied. `undefined`
   * while the change is unconfirmed.
   */
  confirmed: {blockBefore: PortableTextBlock | undefined} | undefined
}

/**
 * The editor side of the pass-through protocol, speaking to the editor only
 * through `EditorForIo`. It is created during the editor's first commit.
 * Batch IDs are the editor's `id` plus a counter, so editors with different
 * IDs never share one. The proposed transaction IDs come from the same
 * per-editor counter, as `<id>-t<counter>`, so they are as unique as the
 * editor's `id`. `keyGenerator` mints keys for repairs and re-keyed inserts.
 */
export function createIo(options: {
  id: string
  editor: EditorForIo
  keyGenerator: () => string
  clock: Clock
}): Io {
  const {editor, keyGenerator, clock} = options
  const listeners = new Set<(event: IoEvent) => void>()
  const emittedBatchIds = new Set<string>()

  let status: IoStatus = 'loading'
  let base: Load = {value: undefined, rev: undefined}
  let outOfStep = false
  let batchCounter = 0
  let inFlight: SentBatch | undefined
  let rejected: SentBatch | undefined
  let echoedAwaitingBase: Array<SentBatch> = []
  let pending: Array<Array<Patch>> = []
  let held: Array<HeldTransaction> = []
  let history: Array<HistoryEntry> = []
  let cancelHeldTimeout: (() => void) | undefined
  let cancelInFlightWarning: (() => void) | undefined
  let reverting: {applied: boolean} | undefined
  const droppedPatches = new WeakSet<Patch>()

  editor.on((event) => {
    switch (event.type) {
      case 'ready':
        becomeReady()
        return
      case 'closing':
        close()
        return
      case 'change':
        if (event.origin === 'local') {
          takeLocalChange(event.patches)
        }
    }
  })

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
    queueKeyRepair(incoming.value)
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
        `Refused a resync while batch "${inFlight.id}" is in flight: wait until it comes back or is rejected, or say what became of it`,
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
    history = []
    releaseHeld()

    if (notApplied) {
      pending = [notApplied.patches, ...pending]
    }

    if (incoming.discardUnsent) {
      pending = []
    }

    queueKeyRepair(incoming.value)
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
   * once. The patches stay pending and go out, as no-ops, with the next batch.
   */
  function reportDroppedPending(after: string) {
    let value = applyWithContentLakeSemantics(
      base.value,
      unconfirmedBatches().flatMap((batch) => batch.patches),
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
   * above a path its batch touched: the host widened the batch. Other patches
   * can't overwrite the batch's work, and patches at the same path or
   * elsewhere can be other writers' batches folded into the same transaction.
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
    const confirmedBatchIds = new Set(
      echoedAwaitingBase
        .filter((batch) => batch.transactionIds.has(incoming.transactionId))
        .map((batch) => batch.id),
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

    const unconfirmedKeys = insertedBlockKeys(
      [
        ...echoedAwaitingBase.filter(
          (batch) => !confirmedBatchIds.has(batch.id),
        ),
        ...(inFlight ? [inFlight] : []),
        ...(rejected ? [rejected] : []),
      ].flatMap((batch) => batch.patches),
    )
    const collidingPatch = incoming.patches.find(
      (patch) =>
        patch.type === 'insert' && insertCollides(patch, unconfirmedKeys),
    )

    if (collidingPatch) {
      return fail({
        reason: 'duplicate key',
        transactionId: incoming.transactionId,
        patch: collidingPatch,
      })
    }

    const screenBefore = deriveScreen()

    captureBlocksBefore(confirmedBatchIds)
    base = {value: nextValue, rev: incoming.resultRev}
    echoedAwaitingBase = echoedAwaitingBase.filter(
      (batch) => !confirmedBatchIds.has(batch.id),
    )

    if (incoming.patches.length > 0) {
      applyToEditor(screenBefore, incoming.patches)
      reportDroppedPending(`transaction "${incoming.transactionId}"`)
    }

    return true
  }

  /** Runs before the base takes the transaction that confirms the batches. */
  function captureBlocksBefore(confirmedBatchIds: Set<string>) {
    history = history.map((entry) =>
      entry.batchId !== undefined && confirmedBatchIds.has(entry.batchId)
        ? {...entry, confirmed: {blockBefore: blockUnder(entry)}}
        : entry,
    )
  }

  /**
   * The step's block in the base with the editor's own unconfirmed changes
   * from before the action applied: what the action changed, as far as the
   * base goes.
   */
  function blockUnder(entry: HistoryEntry): PortableTextBlock | undefined {
    const batches = [
      ...unconfirmedBatches(),
      {id: undefined, patches: pending.flat()},
    ]
    const batchIndex = batches.findIndex((batch) => batch.id === entry.batchId)

    if (batchIndex === -1) {
      return undefined
    }

    const patchesBefore = [
      ...batches.slice(0, batchIndex).flatMap((batch) => batch.patches),
      ...batches[batchIndex].patches.slice(0, entry.patchOffset),
    ]

    return findBlock(
      applyWithContentLakeSemantics(base.value, patchesBefore),
      stepBlockKey(entry.step),
    )
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
      },
    )
  }

  function releaseHeld() {
    held = []
    scheduleHeldTimeout()
  }

  function mutationSent(incoming: MutationSent) {
    if (!emittedBatchIds.has(incoming.id)) {
      warn(`\`mutation sent\` for unknown batch "${incoming.id}"`)
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
        `\`mutation sent\` names transaction "${incoming.transactionId}" for batch "${incoming.id}", already sent as ${[
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
    if (!emittedBatchIds.has(incoming.id)) {
      warn(`\`mutation rejected\` for unknown batch "${incoming.id}"`)
      return
    }

    if (inFlight?.id !== incoming.id) {
      warn(`\`mutation rejected\` for batch "${incoming.id}", not in flight`)
      return
    }

    rejected = inFlight
    inFlight = undefined
    stopInFlightWarning()
  }

  /**
   * Books a local change as pending and records what undo needs to revert
   * it, unless the change is an undo's own revert.
   */
  function takeLocalChange(patches: Array<Patch>) {
    if (status !== 'ready' || patches.length === 0) {
      return
    }

    if (reverting) {
      reverting.applied = true
    } else {
      const step = undoStepOf(patches, deriveScreen())

      if (step) {
        history = [
          ...history,
          {
            step,
            batchId: undefined,
            patchOffset: pending.flat().length,
            confirmed: undefined,
          },
        ]
      }
    }

    pending = [...pending, patches]
    flush()
  }

  /**
   * The editor applies the revert as a local change, which books it. A
   * read-only editor refuses it, and the step stays.
   */
  function undo() {
    if (status === 'unmounted') {
      warn('Ignored an undo after the editor unmounted')
      return
    }

    if (status !== 'ready') {
      throw new Error(`The editor is ${status}`)
    }

    const entry = history.at(-1)

    if (!entry) {
      return
    }

    history = history.slice(0, -1)

    const patches = revert(entry)

    if (patches.length === 0) {
      return
    }

    const attempt = {applied: false}
    reverting = attempt

    try {
      editor.send({type: 'apply', patches, underneath: [], origin: 'local'})
    } finally {
      reverting = undefined
    }

    if (!attempt.applied) {
      history = [...history, entry]
    }
  }

  function revert(entry: HistoryEntry): Array<Patch> {
    const {step} = entry
    const screen = deriveScreen() ?? []

    switch (step.type) {
      case 'typed':
        return deleteTyped(screen, step)
      case 'styled': {
        const block = findBlock(screen, step.blockKey)

        if (block === undefined) {
          return []
        }

        const restored = styleToRestore(entry, step, block)
        const path = [{_key: step.blockKey}, 'style']

        if (restored === undefined || block.style === restored.style) {
          return []
        }

        return [
          restored.style === undefined
            ? unset(path)
            : set(restored.style, path),
        ]
      }
      case 'inserted':
        return deleteBlockByKey(screen, step.blockKey)
      case 'deleted': {
        const block = entry.confirmed
          ? entry.confirmed.blockBefore
          : blockUnder(entry)

        return block === undefined ? [] : restoreBlock(screen, {...step, block})
      }
    }
  }

  /**
   * Once the change is confirmed, a style in the working copy other than the
   * one it set means another writer changed the style after it, and undo
   * leaves it. The working copy, not the base alone, since the editor's own
   * later changes are undone first and may still be unconfirmed. A block the
   * base didn't have before the change came from the placeholder in the same
   * action, so its style before the change is the placeholder's.
   */
  function styleToRestore(
    entry: HistoryEntry,
    step: Extract<UndoStep, {type: 'styled'}>,
    screenBlock: PortableTextBlock,
  ): BlockStyle {
    if (!entry.confirmed) {
      return styleOf(blockUnder(entry)) ?? placeholderStyle
    }

    return styleOf(screenBlock)?.style === step.style
      ? (styleOf(entry.confirmed.blockBefore) ?? placeholderStyle)
      : undefined
  }

  function close() {
    if (status === 'unmounted') {
      return
    }

    if (pending.length > 0) {
      if (rejected) {
        warn(
          `${pending.length} unsent change(s) dropped on close: sending was blocked by the rejection of batch ${rejected.id}`,
        )
        emit({
          type: 'work dropped',
          patches: pending.flat(),
          reason: 'closed while blocked',
        })
        pending = []
      } else {
        emitBatch({final: true})
      }
    }

    status = 'unmounted'
    releaseHeld()
    stopInFlightWarning()
  }

  function flush() {
    if (status !== 'ready' || inFlight || rejected || pending.length === 0) {
      return
    }

    emitBatch({final: false})
  }

  function emitBatch({final}: {final: boolean}) {
    batchCounter++

    const batch: MutationBatch = {
      id: `${options.id}-${batchCounter}`,
      transactionId: `${options.id}-t${batchCounter}`,
      patches: pending.flat(),
      ...(final ? {final: true as const} : {}),
    }

    pending = []
    emittedBatchIds.add(batch.id)
    history = history.map((entry) =>
      entry.batchId === undefined ? {...entry, batchId: batch.id} : entry,
    )

    if (!final) {
      inFlight = {
        id: batch.id,
        patches: batch.patches,
        transactionIds: new Set([batch.transactionId]),
        named: false,
      }
      startInFlightWarning(batch.id, livenessTimeout, clock.now())
    }

    emit({type: 'mutation', ...batch})
  }

  function startInFlightWarning(batchId: string, delay: number, since: number) {
    cancelInFlightWarning = clock.schedule(delay, () => {
      warn(
        `Batch "${batchId}" has been in flight for ${clock.now() - since} ms without coming back`,
      )
      startInFlightWarning(batchId, delay * 2, since)
    })
  }

  function stopInFlightWarning() {
    cancelInFlightWarning?.()
    cancelInFlightWarning = undefined
  }

  /**
   * Sends the editor a transaction's effect when it changed the working copy.
   * A pending insert re-keyed because the base now has its key goes first,
   * as a keyed `_key` set, so the editor's caret stays with its block.
   */
  function applyToEditor(
    screenBefore: Array<PortableTextBlock> | undefined,
    underneath: Array<Patch>,
  ) {
    const newKeys = rekeyPendingInserts(screenBefore)
    const screen = deriveScreen()

    if (isEqual(screenBefore, screen)) {
      return
    }

    editor.send({
      type: 'apply',
      patches: [
        ...[...newKeys].map(([oldKey, newKey]) =>
          set(newKey, [{_key: oldKey}, '_key']),
        ),
        set(screen ?? [], []),
      ],
      underneath,
    })
  }

  function deriveScreen(): Array<PortableTextBlock> | undefined {
    return applyWithContentLakeSemantics(base.value, [
      ...unconfirmedBatches().flatMap((batch) => batch.patches),
      ...pending.flat(),
    ])
  }

  /** Sent batches the base doesn't hold yet, in the order they were sent. */
  function unconfirmedBatches(): Array<SentBatch> {
    return [
      ...echoedAwaitingBase,
      ...(inFlight ? [inFlight] : []),
      ...(rejected ? [rejected] : []),
    ]
  }

  function rekeyPendingInserts(
    screenBefore: Array<PortableTextBlock> | undefined,
  ): Map<string, string> {
    const baseKeys = new Set(
      (base.value ?? []).flatMap((block) => itemKey(block)),
    )
    const pendingInsertKeys = insertedBlockKeys(pending.flat())
    const takenKeys = new Set([
      ...baseKeys,
      ...pendingInsertKeys,
      ...(screenBefore ?? []).map((block) => block._key),
    ])
    const newKeys = new Map<string, string>()

    for (const key of pendingInsertKeys) {
      if (baseKeys.has(key)) {
        newKeys.set(key, generateUniqueKey(keyGenerator, takenKeys))
      }
    }

    if (newKeys.size === 0) {
      return newKeys
    }

    pending = pending.map((patches) =>
      patches.map((patch) => {
        const renamed = renameBlockKeys(patch, newKeys)

        if (droppedPatches.has(patch)) {
          droppedPatches.add(renamed)
        }

        return renamed
      }),
    )
    history = history.map((entry) => ({
      ...entry,
      step: renameStepKeys(entry.step, newKeys),
    }))

    return newKeys
  }

  function queueKeyRepair(value: Array<PortableTextBlock> | undefined) {
    const repairPatches = repairKeys(value, keyGenerator)

    if (repairPatches.length > 0) {
      warn(`Repaired ${repairPatches.length} missing or duplicate keys`)
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

  return {
    getStatus: () => status,
    getSync,
    getBase: () => base,
    inspect: () => ({
      inFlight: inFlight ? describeSentBatch(inFlight) : undefined,
      rejected: rejected ? describeSentBatch(rejected) : undefined,
      echoed: echoedAwaitingBase.map(describeSentBatch),
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
      undoDepth: history.length,
    }),
    on: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load,
    resync,
    transaction,
    mutationSent,
    mutationRejected,
    feedLost,
    undo,
  }
}

function describeSentBatch(batch: SentBatch): IoSentBatch {
  return {
    id: batch.id,
    transactionIds: [...batch.transactionIds],
    patchCount: batch.patches.length,
  }
}

/**
 * What undo needs to revert a local change, read from its patches and the
 * working copy before it. Typing, a style, an insert and a delete are steps,
 * and deleting text isn't. A text diff that grows the span is typing, at the
 * start of the inserted run as the diff places it.
 */
function undoStepOf(
  patches: Array<Patch>,
  screenBefore: Array<PortableTextBlock> | undefined,
): UndoStep | undefined {
  const fromPlaceholder = createsBlock(patches)
  const value = applyWithContentLakeSemantics(
    screenBefore,
    fromPlaceholder ? patches.slice(0, 2) : [],
  )
  const [patch] = fromPlaceholder ? patches.slice(2) : patches
  const [head, field, spanSegment] = patch?.path ?? []
  const blockKey = keyOf(head)

  if (!patch || blockKey === undefined) {
    return undefined
  }

  if (
    patch.type === 'set' &&
    patch.path.length === 2 &&
    field === 'style' &&
    typeof patch.value === 'string'
  ) {
    return {type: 'styled', blockKey, style: patch.value}
  }

  if (patch.type === 'insert' && patch.path.length === 1) {
    const [insertedKey] = patch.items.flatMap((item) => itemKey(item))

    return insertedKey === undefined
      ? undefined
      : {type: 'inserted', blockKey: insertedKey}
  }

  if (patch.type === 'unset' && patch.path.length === 1) {
    const blocks = value ?? []
    const index = blocks.findIndex((block) => block._key === blockKey)

    return index === -1
      ? undefined
      : {
          type: 'deleted',
          block: blocks[index],
          previousKey: blocks[index - 1]?._key,
          nextKey: blocks[index + 1]?._key,
        }
  }

  const spanKey = keyOf(spanSegment)
  const text = resolvePath(value, patch.path)

  if (
    patch.type !== 'diffMatchPatch' ||
    patch.path.length !== 4 ||
    spanKey === undefined ||
    typeof text !== 'string'
  ) {
    return undefined
  }

  const nextText = applyAll(text, [{...patch, path: []}])
  const offset = commonPrefixLength(text, nextText)

  return nextText.length > text.length
    ? {
        type: 'typed',
        blockKey,
        spanKey,
        offset,
        text: nextText.slice(offset, offset + nextText.length - text.length),
      }
    : undefined
}

/**
 * Whether a change turns the placeholder into content: it starts with a
 * whole-field `setIfMissing` followed by an `insert`.
 */
function createsBlock(patches: Array<Patch>): boolean {
  const [first, second] = patches

  return (
    first?.type === 'setIfMissing' &&
    first.path.length === 0 &&
    second?.type === 'insert'
  )
}

/**
 * Removes typed text from its span, at the occurrence nearest its offset.
 * Returns no patches when the span no longer holds the text.
 */
function deleteTyped(
  value: Array<PortableTextBlock>,
  typed: Extract<UndoStep, {type: 'typed'}>,
): Array<Patch> {
  const block = findBlock(value, typed.blockKey)
  const span = block
    ? childrenOf(block).find((child) => itemKey(child)[0] === typed.spanKey)
    : undefined
  const text: unknown =
    typeof span === 'object' && span !== null
      ? Reflect.get(span, 'text')
      : undefined

  if (typeof text !== 'string') {
    return []
  }

  const typedOffset = findNearest(text, typed.text, typed.offset)

  if (typedOffset === undefined) {
    return []
  }

  return [
    diffMatchPatch(
      text,
      text.slice(0, typedOffset) + text.slice(typedOffset + typed.text.length),
      [{_key: typed.blockKey}, 'children', {_key: typed.spanKey}, 'text'],
    ),
  ]
}

/**
 * Removes a block, and the field with it when it was the last. Returns no
 * patches when the block is gone.
 */
function deleteBlockByKey(
  value: Array<PortableTextBlock>,
  blockKey: string,
): Array<Patch> {
  if (findBlock(value, blockKey) === undefined) {
    return []
  }

  return value.length === 1
    ? [unset([{_key: blockKey}]), unset([])]
    : [unset([{_key: blockKey}])]
}

/**
 * Puts a deleted block back after its previous sibling, or else before its
 * next one, or else first. An empty field gets the block as its content.
 * Returns no patches when the block's key is in the working copy.
 */
function restoreBlock(
  value: Array<PortableTextBlock>,
  deleted: Extract<UndoStep, {type: 'deleted'}>,
): Array<Patch> {
  const {block} = deleted

  if (findBlock(value, block._key) !== undefined) {
    return []
  }

  if (value.length === 0) {
    return [setIfMissing([], []), insert([block], 'before', [0])]
  }

  if (
    deleted.previousKey !== undefined &&
    findBlock(value, deleted.previousKey) !== undefined
  ) {
    return [insert([block], 'after', [{_key: deleted.previousKey}])]
  }

  const reference =
    deleted.nextKey !== undefined &&
    findBlock(value, deleted.nextKey) !== undefined
      ? deleted.nextKey
      : value[0]._key

  return [insert([block], 'before', [{_key: reference}])]
}

/**
 * The start of the occurrence of `search` in `text` nearest `offset`, looking
 * after the offset first at each distance.
 */
function findNearest(
  text: string,
  search: string,
  offset: number,
): number | undefined {
  for (
    let distance = 0;
    distance <= Math.max(offset, text.length);
    distance++
  ) {
    for (const candidate of [offset + distance, offset - distance]) {
      if (candidate >= 0 && text.startsWith(search, candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

function commonPrefixLength(textA: string, textB: string): number {
  let length = 0

  while (
    length < textA.length &&
    length < textB.length &&
    textA[length] === textB[length]
  ) {
    length++
  }

  return length
}

function keyOf(segment: Patch['path'][number] | undefined): string | undefined {
  return typeof segment === 'object' &&
    !Array.isArray(segment) &&
    typeof segment._key === 'string'
    ? segment._key
    : undefined
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

/** Whether `ancestor` is a strict prefix of `path`. */
function isAncestorPath(ancestor: Patch['path'], path: Patch['path']): boolean {
  return (
    ancestor.length < path.length &&
    ancestor.every((segment, index) => isEqual(segment, path[index]))
  )
}

function stepBlockKey(step: UndoStep): string {
  return step.type === 'deleted' ? step.block._key : step.blockKey
}

function findBlock(
  value: Array<PortableTextBlock> | undefined,
  blockKey: string,
): PortableTextBlock | undefined {
  return value?.find((candidate) => candidate._key === blockKey)
}

function styleOf(block: PortableTextBlock | undefined): BlockStyle {
  if (!block) {
    return undefined
  }

  const style: unknown = block.style

  return {style: typeof style === 'string' ? style : undefined}
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

function insertedBlockKeys(patches: Array<Patch>): Set<string> {
  return new Set(
    patches.flatMap((patch) =>
      patch.type === 'insert' && patch.path.length === 1
        ? patch.items.flatMap((item) => itemKey(item))
        : [],
    ),
  )
}

function renameBlockKeys(patch: Patch, newKeys: Map<string, string>): Patch {
  const [head, ...tail] = patch.path
  const renamedPath =
    typeof head === 'object' && !Array.isArray(head) && newKeys.has(head._key)
      ? [{_key: newKeys.get(head._key) ?? head._key}, ...tail]
      : patch.path

  if (patch.type === 'insert' && patch.path.length === 1) {
    return {
      ...patch,
      path: renamedPath,
      items: patch.items.map((item) => {
        const [key] = itemKey(item)

        return key !== undefined &&
          newKeys.has(key) &&
          typeof item === 'object' &&
          !Array.isArray(item)
          ? {...item, _key: newKeys.get(key) ?? key}
          : item
      }),
    }
  }

  return {...patch, path: renamedPath}
}

function renameStepKeys(
  step: UndoStep,
  newKeys: Map<string, string>,
): UndoStep {
  const rename = (key: string | undefined) =>
    key === undefined ? undefined : (newKeys.get(key) ?? key)

  if (step.type === 'deleted') {
    return {
      ...step,
      block: {...step.block, _key: rename(step.block._key) ?? step.block._key},
      previousKey: rename(step.previousKey),
      nextKey: rename(step.nextKey),
    }
  }

  return {...step, blockKey: rename(step.blockKey) ?? step.blockKey}
}

/**
 * Repairs missing and duplicate keys among blocks and among each block's
 * children, keeping the first of each duplicate. Index paths address the
 * nodes, since a missing or duplicate key can't. New keys collide with no
 * key anywhere in the value.
 */
function repairKeys(
  value: Array<PortableTextBlock> | undefined,
  keyGenerator: () => string,
): Array<Patch> {
  const patches: Array<Patch> = []
  const takenKeys = new Set(
    (value ?? []).flatMap((block) => [
      ...itemKey(block),
      ...childrenOf(block).flatMap((child) => itemKey(child)),
    ]),
  )
  const blockKeys = new Set<string>()

  for (const [blockIndex, block] of (value ?? []).entries()) {
    const [blockKey] = itemKey(block)

    if (blockKey === undefined || blockKeys.has(blockKey)) {
      patches.push(
        set(generateUniqueKey(keyGenerator, takenKeys), [blockIndex, '_key']),
      )
    } else {
      blockKeys.add(blockKey)
    }

    const childKeys = new Set<string>()

    for (const [childIndex, child] of childrenOf(block).entries()) {
      const [childKey] = itemKey(child)

      if (childKey === undefined || childKeys.has(childKey)) {
        patches.push(
          set(generateUniqueKey(keyGenerator, takenKeys), [
            blockIndex,
            'children',
            childIndex,
            '_key',
          ]),
        )
      } else {
        childKeys.add(childKey)
      }
    }
  }

  return patches
}

function childrenOf(block: PortableTextBlock): Array<unknown> {
  const children: unknown = Reflect.get(block, 'children')

  return Array.isArray(children) ? children : []
}

function itemKey(item: unknown): Array<string> {
  if (typeof item !== 'object' || item === null || !('_key' in item)) {
    return []
  }

  return typeof item._key === 'string' && item._key !== '' ? [item._key] : []
}

function isEqual(valueA: unknown, valueB: unknown): boolean {
  if (valueA === valueB) {
    return true
  }

  if (
    typeof valueA !== 'object' ||
    typeof valueB !== 'object' ||
    valueA === null ||
    valueB === null ||
    Array.isArray(valueA) !== Array.isArray(valueB)
  ) {
    return false
  }

  const keysA = Object.keys(valueA)
  const keysB = Object.keys(valueB)

  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key) =>
        Object.hasOwn(valueB, key) &&
        isEqual(Reflect.get(valueA, key), Reflect.get(valueB, key)),
    )
  )
}
