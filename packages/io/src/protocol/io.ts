import {
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
import {blocksForEditor, isBelowFloor, isObject, repairToFloor} from './floor'
import {mapOffsetThrough, textEditPatch, textEditsOf} from './text-edits'
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
  /** How many of the editor's own changes undo can still revert. */
  undoDepth: number
}

/**
 * What io holds beyond its snapshot, for the model's tests and world. The
 * base and the working copy, the base with the unconfirmed mutations and the
 * pending changes applied, without the blocks that aren't objects: what the
 * editor shows, the placeholder aside. `undo` reverts the last of the
 * editor's own changes that undo can still revert, through
 * `applyLocalEdit`, as a user action.
 */
export type IoInternals = {
  getBase: () => Load
  getWorkingCopy: () => Array<PortableTextBlock> | undefined
  inspect: () => IoLedger
  undo: () => void
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
  mutationId: string | undefined
  /** How many patches of the entry's mutation come before the action's own. */
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
 * Mutation IDs are the editor's `id` plus a counter, so editors with different
 * IDs never share one. The transaction ID proposed with each mutation comes
 * from `transactionIdGenerator`, a random UUID by default, since a
 * transaction ID must be unique across every writer of the document, not
 * only among this editor's mutations. `keyGenerator` mints the new keys a resync gives pending
 * inserts whose keys the copy has. Keys io mints to repair a received value
 * come from the value's revision and the repaired node's path instead (see
 * `repairToFloor`).
 * `applyLocalEdit` is the model's seam for undo, outside `EditorForIo`: it
 * applies patches to the editor as the user's own edit, which the editor
 * reports as a local `change`, or refuses while read-only.
 */
export function createIo(options: {
  id: string
  editor: EditorForIo
  keyGenerator: () => string
  transactionIdGenerator?: () => string
  clock: Clock
  applyLocalEdit: (patches: Array<Patch>) => void
}): Io {
  const {
    editor,
    keyGenerator,
    transactionIdGenerator = randomTransactionId,
    clock,
    applyLocalEdit,
  } = options
  const listeners = new Set<(event: IoEvent) => void>()
  const observers = new Set<(snapshot: IoSnapshot) => void>()
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
  let history: Array<HistoryEntry> = []
  let cancelHeldTimeout: (() => void) | undefined
  let cancelInFlightWarning: (() => void) | undefined
  let reverting: {applied: boolean} | undefined
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
    history = []
    releaseHeld()

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

    captureBlocksBefore(confirmedMutationIds)
    mapStepsThrough(incoming.patches, valueBefore, ownPatches)
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

  /**
   * Moves each typing step's offset past the text that `patches` inserted or
   * deleted before it in its span, applying them to `valueBefore` in turn.
   * `ownPatches` are the editor's own and move no step: its own work was in
   * the working copy already.
   */
  function mapStepsThrough(
    patches: Array<Patch>,
    valueBefore: Array<PortableTextBlock> | undefined,
    ownPatches: Array<Patch>,
  ) {
    const unmatchedOwnPatches = [...ownPatches]
    let value = valueBefore

    for (const patch of patches) {
      const ownIndex = unmatchedOwnPatches.findIndex((ownPatch) =>
        isEqual(ownPatch, patch),
      )
      const text = resolvePath(value, patch.path)

      if (ownIndex !== -1) {
        unmatchedOwnPatches.splice(ownIndex, 1)
      } else if (patch.type === 'diffMatchPatch' && typeof text === 'string') {
        const edits = textEditsOf(patch.value, text)

        history = history.map((entry) =>
          entry.step.type === 'typed' &&
          isEqual(patch.path, typedPath(entry.step))
            ? {
                ...entry,
                step: {
                  ...entry.step,
                  offset: mapOffsetThrough(entry.step.offset, edits),
                },
              }
            : entry,
        )
      }

      try {
        value = applyWithContentLakeSemantics(value, [patch])
      } catch {
        return
      }
    }
  }

  /** Runs before the base takes the transaction that confirms the mutations. */
  function captureBlocksBefore(confirmedMutationIds: Set<string>) {
    history = history.map((entry) =>
      entry.mutationId !== undefined &&
      confirmedMutationIds.has(entry.mutationId)
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
    const mutations = [
      ...unconfirmedMutations(),
      {id: undefined, patches: pending.flat()},
    ]
    const mutationIndex = mutations.findIndex(
      (mutation) => mutation.id === entry.mutationId,
    )

    if (mutationIndex === -1) {
      return undefined
    }

    const patchesBefore = [
      ...mutations
        .slice(0, mutationIndex)
        .flatMap((mutation) => mutation.patches),
      ...mutations[mutationIndex].patches.slice(0, entry.patchOffset),
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

  /**
   * Books a local change as pending and records what undo needs to revert
   * it, unless the change is an undo's own revert. The steps already
   * recorded move with the text the change inserted or deleted before them.
   */
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

    const screenBefore = deriveScreen()

    mapStepsThrough(operations, screenBefore, [])

    if (reverting) {
      reverting.applied = true
    } else {
      const step = undoStepOf(operations, screenBefore)

      if (step) {
        history = [
          ...history,
          {
            step,
            mutationId: undefined,
            patchOffset: pending.flat().length,
            confirmed: undefined,
          },
        ]
      }
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
      applyLocalEdit(patches)
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
    history = history.map((entry) =>
      entry.mutationId === undefined
        ? {...entry, mutationId: mutation.id}
        : entry,
    )

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
   * in its later patches too. Only a resync does this: history is clear by
   * then.
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
      undoDepth: history.length,
    }),
    undo: () => {
      undo()
      publish()
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
 * What undo needs to revert a local change, read from its operations and the
 * working copy before it. Typing, a style, an insert and a delete are steps,
 * and deleting text isn't. A text operation that inserts one run of text is
 * typing, at the offset the operation names.
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

  const edits = textEditsOf(patch.value, text)
  const [edit] = edits

  return edits.length === 1 && edit.type === 'insert'
    ? {type: 'typed', blockKey, spanKey, offset: edit.offset, text: edit.text}
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
    textEditPatch(
      text,
      {offset: typedOffset, deleteLength: typed.text.length},
      typedPath(typed),
    ),
  ]
}

function typedPath(typed: Extract<UndoStep, {type: 'typed'}>): Patch['path'] {
  return [{_key: typed.blockKey}, 'children', {_key: typed.spanKey}, 'text']
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

/**
 * The instructions that take the editor's tree from `shown` to `wanted` for
 * other writers' `patches`, given the `unlanded` work the editor had on top
 * of the base, decided per list (the block list, or a block's `children`).
 * A list is lined up against `wanted` key by key when the patches insert
 * into it, remove from it or change a key in it while unlanded work touched
 * it (changed its items or anything in them), and whenever the patches
 * change a key in it: none of the patches on that list is forwarded, since
 * a later patch can depend on an earlier one (an insert after a new key, a
 * block removed and inserted again elsewhere). A patch on the whole field,
 * or by index, while there is unlanded work lines up the block list.
 *
 * On a list that isn't lined up, a patch on a place no unlanded patch
 * touched is forwarded as it is, and a patch on a block unlanded work
 * touched becomes a `set` of the block from `wanted` (or an `unset` when
 * `wanted` lost it), since the server applied the editor's work after the
 * patch and the screen applied it before.
 *
 * With no unlanded work, a patch addressed by index in `stored`, the base
 * the patches apply to, is addressed to the editor's block first (see
 * `addressForEditor`), since the editor leaves out the stored blocks that
 * aren't objects.
 *
 * The forwarded patches go first: they touch nothing the rest lines up, and
 * a forwarded patch into a block a later instruction inserts does nothing,
 * as the block arrives from `wanted` with it applied.
 */
function authorInstructions({
  stored,
  shown,
  wanted,
  patches,
  unlanded,
}: {
  stored: Array<PortableTextBlock> | undefined
  shown: Array<PortableTextBlock> | undefined
  wanted: Array<PortableTextBlock> | undefined
  patches: Array<Patch>
  unlanded: Array<Patch>
}): Array<Patch> {
  const addressed =
    unlanded.length === 0 ? addressForEditor(patches, stored) : patches

  if (addressed === undefined) {
    return lineUpList(shown ?? [], wanted ?? [], [])
  }

  const touched = touchedPlaces(unlanded)
  const places = addressed.map((patch) => ({patch, place: placeOf(patch)}))
  const lineUpBlockList = places.some(
    ({place}) =>
      (place.type === 'field' && unlanded.length > 0) ||
      (place.type === 'block list' &&
        (place.change === 'key' ||
          (place.change === 'membership' && touched.blockList))),
  )
  const linedUpChildLists = new Set(
    places.flatMap(({place}) =>
      place.type === 'child list' &&
      (place.change === 'key' ||
        (place.change === 'membership' &&
          touched.childLists.has(place.blockKey)))
        ? [place.blockKey]
        : [],
    ),
  )
  const forwarded: Array<Patch> = []
  const conflictingBlocks = new Set<string>()

  for (const {patch, place} of places) {
    if (place.type === 'field' || touched.field) {
      if (unlanded.length === 0) {
        forwarded.push(patch)
      }
    } else if (place.type === 'block list' && lineUpBlockList) {
      continue
    } else if (
      place.type === 'child list' &&
      linedUpChildLists.has(place.blockKey)
    ) {
      continue
    } else if (touched.blocks.has(place.blockKey)) {
      conflictingBlocks.add(place.blockKey)
    } else {
      forwarded.push(patch)
    }
  }

  const current = applyWithContentLakeSemantics(shown, forwarded) ?? []
  const target = wanted ?? []

  if (lineUpBlockList || touched.field) {
    return [...forwarded, ...lineUpList(current, target, [])]
  }

  const fixes: Array<Patch> = []

  for (const blockKey of new Set([
    ...conflictingBlocks,
    ...linedUpChildLists,
  ])) {
    const shownBlock = findBlock(current, blockKey)
    const wantedBlock = findBlock(target, blockKey)

    if (wantedBlock === undefined) {
      fixes.push(...(shownBlock ? [unset([{_key: blockKey}])] : []))
    } else if (shownBlock === undefined) {
      return [...forwarded, ...lineUpList(current, target, [])]
    } else if (
      !conflictingBlocks.has(blockKey) &&
      isEqual(
        {...shownBlock, children: undefined},
        {...wantedBlock, children: undefined},
      )
    ) {
      fixes.push(
        ...lineUpList(childrenOf(shownBlock), childrenOf(wantedBlock), [
          {_key: blockKey},
          'children',
        ]),
      )
    } else if (!isEqual(shownBlock, wantedBlock)) {
      fixes.push(set(wantedBlock, [{_key: blockKey}]))
    }
  }

  return [...forwarded, ...fixes]
}

/**
 * `patches` with each path that starts with an index in the stored array,
 * taken patch by patch from `stored`, addressed to that block in the
 * editor instead: by its key, or else by its position among the blocks
 * that are objects. `undefined` when a patch by index targets no block
 * that is an object, or brings a block that isn't one.
 */
function addressForEditor(
  patches: Array<Patch>,
  stored: Array<PortableTextBlock> | undefined,
): Array<Patch> | undefined {
  const addressed: Array<Patch> = []
  let value = stored

  for (const patch of patches) {
    const [head, ...tail] = patch.path

    if (typeof head === 'number') {
      const storedBlocks = value ?? []
      const {blocks, storedIndexes} = blocksForEditor(storedBlocks)
      const position = storedIndexes.indexOf(
        head < 0 ? storedBlocks.length + head : head,
      )

      if (position === -1 || bringsNonObjectBlock(patch)) {
        return undefined
      }

      const [key] = itemKey(blocks[position])

      addressed.push({
        ...patch,
        path: [key === undefined ? position : {_key: key}, ...tail],
      })
    } else {
      addressed.push(patch)
    }

    value = applyWithContentLakeSemantics(value, [patch])
  }

  return addressed
}

function bringsNonObjectBlock(patch: Patch): boolean {
  if (patch.path.length !== 1) {
    return false
  }

  if (patch.type === 'insert') {
    return patch.items.some((item) => !isObject(item))
  }

  return patch.type === 'set' && !isObject(patch.value)
}

/**
 * Where a patch acts: the whole `field` (a path that is empty or starts
 * with an index), the `block list` (a block, or a field of a block outside
 * its keyed children), or the `child list` of `blockKey` (a keyed child, or
 * anything under one). `change` says whether the patch changes the list's
 * `membership` (an insert into it, or an `unset` of one of its items) or
 * an item's `key` (a patch on its `_key`, or a `set` of the item whose
 * value has another `_key`).
 */
function placeOf(
  patch: Patch,
):
  | {type: 'field'}
  | {type: 'block list'; blockKey: string; change: ListChange}
  | {type: 'child list'; blockKey: string; change: ListChange} {
  const [head, field, childSegment] = patch.path
  const blockKey = keyOf(head)

  if (blockKey === undefined) {
    return {type: 'field'}
  }

  const childKey = field === 'children' ? keyOf(childSegment) : undefined

  if (childKey === undefined) {
    return {
      type: 'block list',
      blockKey,
      change: listChangeOf(patch, 1, blockKey),
    }
  }

  return {
    type: 'child list',
    blockKey,
    change: listChangeOf(patch, 3, childKey),
  }
}

type ListChange = 'membership' | 'key' | undefined

/**
 * What a patch does to the list whose item is at `itemDepth` in its path,
 * the item keyed `key`.
 */
function listChangeOf(
  patch: Patch,
  itemDepth: number,
  key: string,
): ListChange {
  const {path} = patch

  if (
    path.length === itemDepth &&
    (patch.type === 'insert' || patch.type === 'unset')
  ) {
    return 'membership'
  }

  if (path.length === itemDepth + 1 && path[itemDepth] === '_key') {
    return 'key'
  }

  if (
    path.length === itemDepth &&
    patch.type === 'set' &&
    key !== itemKey(patch.value)[0]
  ) {
    return 'key'
  }

  return undefined
}

/**
 * The places unlanded work touched: the whole `field`; the block list, by
 * any patch on or under a block; the `children` lists, by any patch on or
 * under one of their children; and the blocks it acted on or under for
 * anything but their removal. A patch under a removed block finds nothing
 * on either side.
 */
function touchedPlaces(unlanded: Array<Patch>): {
  field: boolean
  blockList: boolean
  childLists: Set<string>
  blocks: Set<string>
} {
  const touched = {
    field: false,
    blockList: false,
    childLists: new Set<string>(),
    blocks: new Set<string>(),
  }

  for (const patch of unlanded) {
    const place = placeOf(patch)

    if (place.type === 'field') {
      touched.field = true
      continue
    }

    touched.blockList = true

    if (place.type === 'child list') {
      touched.childLists.add(place.blockKey)
    }

    if (place.type === 'child list' || place.change !== 'membership') {
      touched.blocks.add(place.blockKey)
    }
  }

  return touched
}

/**
 * Keyed instructions that line `shown` up with `wanted`, the list at
 * `listPath`: the longest run of keys in the same order on both sides stays,
 * every other shown item is removed, every other wanted item is inserted
 * next to a keyed sibling that is there by then, and an item that stays but
 * differs is `set`. A list with a missing or repeated key gets a `set` of the
 * whole list, and an empty one gets its items by index.
 */
function lineUpList(
  shown: Array<unknown>,
  wanted: Array<unknown>,
  listPath: Patch['path'],
): Array<Patch> {
  const shownKeys = shown.map((item) => itemKey(item)[0])
  const wantedKeys = wanted.map((item) => itemKey(item)[0])

  if (!hasUniqueKeys(shownKeys) || !hasUniqueKeys(wantedKeys)) {
    return [set(wanted, listPath)]
  }

  if (shown.length === 0) {
    return wanted.length === 0
      ? []
      : [setIfMissing([], listPath), insert(wanted, 'before', [...listPath, 0])]
  }

  const stays = new Set(longestCommonRun(shownKeys, wantedKeys))
  const itemPath = (key: string) => [...listPath, {_key: key}]
  const firstStaying = wantedKeys.find((key) => stays.has(key))

  if (firstStaying === undefined) {
    return [
      ...(wanted.length > 0
        ? [insert(wanted, 'before', itemPath(shownKeys[0]))]
        : []),
      ...shownKeys.map((key) => unset(itemPath(key))),
    ]
  }

  const removals = shownKeys
    .filter((key) => !stays.has(key))
    .map((key) => unset(itemPath(key)))
  const inserts = wanted.flatMap((item, index) => {
    if (stays.has(wantedKeys[index])) {
      return []
    }

    const previousKey = wantedKeys[index - 1]

    return previousKey === undefined
      ? [insert([item], 'before', itemPath(firstStaying))]
      : [insert([item], 'after', itemPath(previousKey))]
  })
  const sets = wanted.flatMap((item, index) => {
    const key = wantedKeys[index]

    return stays.has(key) && !isEqual(shown[shownKeys.indexOf(key)], item)
      ? [set(item, itemPath(key))]
      : []
  })

  return [...removals, ...inserts, ...sets]
}

function hasUniqueKeys(keys: Array<string | undefined>): keys is Array<string> {
  return (
    keys.every((key) => key !== undefined) && new Set(keys).size === keys.length
  )
}

/** The longest sequence of keys that appears in both lists in order. */
function longestCommonRun(
  keysA: Array<string>,
  keysB: Array<string>,
): Array<string> {
  const lengths = Array.from({length: keysA.length + 1}, () =>
    Array.from({length: keysB.length + 1}, () => 0),
  )

  for (let indexA = keysA.length - 1; indexA >= 0; indexA--) {
    for (let indexB = keysB.length - 1; indexB >= 0; indexB--) {
      lengths[indexA][indexB] =
        keysA[indexA] === keysB[indexB]
          ? lengths[indexA + 1][indexB + 1] + 1
          : Math.max(lengths[indexA + 1][indexB], lengths[indexA][indexB + 1])
    }
  }

  const run: Array<string> = []
  let indexA = 0
  let indexB = 0

  while (indexA < keysA.length && indexB < keysB.length) {
    if (keysA[indexA] === keysB[indexB]) {
      run.push(keysA[indexA])
      indexA++
      indexB++
    } else if (lengths[indexA + 1][indexB] >= lengths[indexA][indexB + 1]) {
      indexA++
    } else {
      indexB++
    }
  }

  return run
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
