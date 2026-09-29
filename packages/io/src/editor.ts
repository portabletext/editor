import {set, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  applyWithContentLakeSemantics,
  hasTarget,
  resolvePath,
} from './content-lake'
import {
  createDocument,
  generateUniqueKey,
  type ActionResult,
  type Document,
  type UndoStep,
} from './document'
import type {
  ChangeEvent,
  ErrorEvent,
  Load,
  MutationBatch,
  MutationRejected,
  MutationSent,
  Resync,
  Transaction,
} from './types'

const heldTransactionTimeout = 10_000
const livenessTimeout = 10_000

export type Clock = {
  now: () => number
  /** Returns a function that cancels the callback. */
  schedule: (delay: number, callback: () => void) => () => void
}

export type IoEditorStatus = 'loading' | 'ready' | 'unmounted'

export type IoEditorEvent =
  | ({type: 'mutation'} & MutationBatch)
  | ({type: 'change'} & ChangeEvent)
  | ({type: 'error'} & ErrorEvent)
  | {type: 'warning'; message: string}
  | {type: 'ready'}

/**
 * A batch the editor has sent and the base doesn't hold yet. `transactionId`
 * is `undefined` until the host reports `mutation sent`.
 */
export type IoEditorSentBatch = {
  id: string
  transactionId: string | undefined
  patchCount: number
}

/**
 * The editor's protocol state, for display. `echoed` are batches whose
 * transaction came back but waits in `held` behind a missing one, and
 * `pending` holds one entry per local change not sent yet.
 */
export type IoEditorLedger = {
  inFlight: IoEditorSentBatch | undefined
  rejected: IoEditorSentBatch | undefined
  echoed: Array<IoEditorSentBatch>
  pending: Array<{patchCount: number; patches: Array<Patch>}>
  held: Array<
    Pick<Transaction, 'transactionId' | 'previousRev' | 'resultRev'> & {
      arrivedAt: number
    }
  >
  outOfStep: boolean
  readOnly: boolean
  /** How many of the editor's own changes undo can still revert. */
  undoDepth: number
}

export type IoEditor = {
  /** The content on screen and the caret. */
  document: Document
  getStatus: () => IoEditorStatus
  getBase: () => Load
  inspect: () => IoEditorLedger
  on: (listener: (event: IoEditorEvent) => void) => () => void

  /**
   * Ends the first commit. An editor that doesn't claim the first load
   * becomes ready here.
   */
  mount: () => void
  load: (load: Load) => void
  releaseClaim: () => void
  resync: (resync: Resync) => void
  transaction: (transaction: Transaction) => void
  mutationSent: (mutationSent: MutationSent) => void
  mutationRejected: (mutationRejected: MutationRejected) => void
  updateReadOnly: (readOnly: boolean) => void

  setStyle: (style: string) => void
  type: (text: string) => void
  deleteBeforeCaret: (text: string) => void
  putCaretAfter: (text: string) => void
  insertBlock: (textspec: string) => void
  deleteBlock: (text: string) => void
  undo: () => void
  close: () => void
}

type SentBatch = {
  id: string
  patches: Array<Patch>
  transactionId: string | undefined
}

type HeldTransaction = {transaction: Transaction; arrivedAt: number}

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
 * The editor side of the pass-through protocol. Batch IDs are the editor's
 * `id` plus a counter, so editors with different IDs never share one.
 */
export function createIoEditor(options: {
  id: string
  keyGenerator: () => string
  clock: Clock
  claimLoad?: boolean
}): IoEditor {
  const {keyGenerator, clock} = options
  const listeners = new Set<(event: IoEditorEvent) => void>()
  const document = createDocument({keyGenerator}, {value: undefined})
  const emittedBatchIds = new Set<string>()

  let status: IoEditorStatus = 'loading'
  let mounted = false
  let base: Load = {value: undefined, rev: undefined}
  let readOnly = false
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
  let cancelLoadWarning: (() => void) | undefined

  function emit(event: IoEditorEvent) {
    for (const listener of listeners) {
      listener(event)
    }
  }

  function warn(message: string) {
    emit({type: 'warning', message})
  }

  function mount() {
    if (mounted) {
      throw new Error('The editor is already mounted')
    }

    mounted = true

    if (!options.claimLoad) {
      becomeReady()
      return
    }

    if (status === 'loading') {
      cancelLoadWarning = clock.schedule(livenessTimeout, () => {
        cancelLoadWarning = undefined
        warn(
          `The claimed first load hasn't arrived after ${livenessTimeout} ms`,
        )
      })
    }
  }

  function load(incoming: Load) {
    if (status === 'unmounted') {
      warn('Ignored a load after the editor unmounted')
      return
    }

    if (!options.claimLoad || status !== 'loading') {
      throw new Error('`load` is only accepted while the first load is claimed')
    }

    base = {value: incoming.value, rev: incoming.rev}
    queueKeyRepair(incoming.value)
    document.setValue(deriveScreen())
    becomeReady()
  }

  function releaseClaim() {
    if (options.claimLoad && status === 'loading') {
      becomeReady()
    }
  }

  function becomeReady() {
    cancelLoadWarning?.()
    cancelLoadWarning = undefined
    status = 'ready'
    emit({type: 'ready'})
    flush()
  }

  function resync(incoming: Resync) {
    if (status === 'unmounted') {
      warn('Ignored a resync after the editor unmounted')
      return
    }

    if (status === 'loading') {
      throw new Error('`resync` is not accepted before the editor is ready')
    }

    if (inFlight) {
      warn(
        `Refused a resync while batch "${inFlight.id}" is in flight: wait until it comes back or is rejected`,
      )
      return
    }

    base = {value: incoming.value, rev: incoming.rev}
    rejected = undefined
    echoedAwaitingBase = []
    outOfStep = false
    history = []
    releaseHeld()

    if (incoming.discardUnsent) {
      pending = []
    }

    queueKeyRepair(incoming.value)
    warnAboutUnappliedPending()
    updateScreen()
    flush()
  }

  function warnAboutUnappliedPending() {
    let value = base.value
    let unapplied = 0

    for (const patch of pending.flat()) {
      if (!hasTarget(value, patch)) {
        unapplied++
      }

      value = applyWithContentLakeSemantics(value, [patch])
    }

    if (unapplied > 0) {
      warn(
        `${unapplied} unsent patches had no target after the resync and did nothing`,
      )
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

    noteOwnTransaction(incoming.transactionId)

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

  function noteOwnTransaction(transactionId: string) {
    if (inFlight && inFlight.transactionId === transactionId) {
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
        .filter((batch) => batch.transactionId === incoming.transactionId)
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

    captureBlocksBefore(confirmedBatchIds)
    base = {value: nextValue, rev: incoming.resultRev}
    echoedAwaitingBase = echoedAwaitingBase.filter(
      (batch) => !confirmedBatchIds.has(batch.id),
    )

    if (incoming.patches.length > 0) {
      updateScreen()
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

    if (inFlight?.id === incoming.id) {
      inFlight = {...inFlight, transactionId: incoming.transactionId}
    }
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

  function act(run: () => ActionResult) {
    if (!canEdit()) {
      return
    }

    const result = run()

    if (result.patches.length === 0) {
      return
    }

    if (result.undoStep) {
      history = [
        ...history,
        {
          step: result.undoStep,
          batchId: undefined,
          patchOffset: pending.flat().length,
          confirmed: undefined,
        },
      ]
    }

    commitLocalChange(result.patches)
  }

  function undo() {
    const entry = history.at(-1)

    if (!canEdit() || !entry) {
      return
    }

    history = history.slice(0, -1)
    commitLocalChange(revert(entry))
  }

  function revert(entry: HistoryEntry): Array<Patch> {
    const {step} = entry

    switch (step.type) {
      case 'typed':
        return document.deleteText(step)
      case 'styled': {
        const block = findBlock(document.getValue(), step.blockKey)

        if (block === undefined) {
          return []
        }

        const restored = styleToRestore(entry, step, block)

        return restored === undefined || block.style === restored.style
          ? []
          : document.setBlockStyle(step.blockKey, restored.style)
      }
      case 'inserted':
        return document.deleteBlockByKey(step.blockKey)
      case 'deleted': {
        const block = entry.confirmed
          ? entry.confirmed.blockBefore
          : blockUnder(entry)

        return block === undefined
          ? []
          : document.restoreBlock({...step, block})
      }
    }
  }

  /**
   * Once the change is confirmed, a style on screen other than the one it set
   * means another writer changed the style after it, and undo leaves it. The
   * screen, not the base alone, since the editor's own later changes are
   * undone first and may still be unconfirmed. A block the base didn't have
   * before the change came from the placeholder in the same action, so its
   * style before the change is the placeholder's.
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

  function canEdit(): boolean {
    if (status === 'unmounted') {
      warn('Ignored an action after the editor unmounted')
      return false
    }

    if (status !== 'ready') {
      throw new Error(`The editor is ${status}`)
    }

    return !readOnly
  }

  function commitLocalChange(patches: Array<Patch>) {
    if (patches.length === 0) {
      return
    }

    pending = [...pending, patches]
    emit({type: 'change', operations: patches, origin: 'local'})
    flush()
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
        pending = []
      } else {
        emitBatch({final: true})
      }
    }

    status = 'unmounted'
    releaseHeld()
    stopInFlightWarning()
    cancelLoadWarning?.()
    cancelLoadWarning = undefined
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
      patches: pending.flat(),
      value: getContent(),
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
        transactionId: undefined,
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

  function updateScreen() {
    const newKeys = rekeyPendingInserts()
    const caret = document.getCaret()
    const caretBlockKey = newKeys.get(caret.blockKey)
    const before = document.getValue()
    document.setValue(deriveScreen())
    const after = document.getValue()

    if (caretBlockKey !== undefined) {
      // The old key now names another writer's block, so the caret would
      // follow the key into it. When the re-keyed insert lost its target, the
      // caret's block is gone and the caret goes where a vanished block's
      // caret goes.
      document.setCaret(
        after.some((block) => block._key === caretBlockKey)
          ? {blockKey: caretBlockKey, offset: caret.offset}
          : {blockKey: after[0]._key, offset: 0},
      )
    }

    if (!isEqual(before, after)) {
      emit({type: 'change', operations: [set(after, [])], origin: 'remote'})
    }
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

  function rekeyPendingInserts(): Map<string, string> {
    const baseKeys = new Set(
      (base.value ?? []).flatMap((block) => itemKey(block)),
    )
    const pendingInsertKeys = insertedBlockKeys(pending.flat())
    const takenKeys = new Set([
      ...baseKeys,
      ...pendingInsertKeys,
      ...document.getValue().map((block) => block._key),
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
      patches.map((patch) => renameBlockKeys(patch, newKeys)),
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

  function getContent(): Array<PortableTextBlock> | undefined {
    return document.getPlaceholderKey() === undefined
      ? document.getValue()
      : undefined
  }

  function putCaretAfter(text: string) {
    if (status === 'unmounted') {
      warn('Ignored an action after the editor unmounted')
      return
    }

    document.putCaretAfter(text)
  }

  return {
    document,
    getStatus: () => status,
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
      readOnly,
      undoDepth: history.length,
    }),
    on: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    mount,
    load,
    releaseClaim,
    resync,
    transaction,
    mutationSent,
    mutationRejected,
    updateReadOnly: (nextReadOnly) => {
      readOnly = nextReadOnly
    },
    setStyle: (style) => act(() => document.setStyle(style)),
    type: (text) => act(() => document.type(text)),
    deleteBeforeCaret: (text) => act(() => document.deleteBeforeCaret(text)),
    putCaretAfter,
    insertBlock: (textspec) => act(() => document.insertBlock(textspec)),
    deleteBlock: (text) => act(() => document.deleteBlock(text)),
    undo,
    close,
  }
}

function describeSentBatch(batch: SentBatch): IoEditorSentBatch {
  return {
    id: batch.id,
    transactionId: batch.transactionId,
    patchCount: batch.patches.length,
  }
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
