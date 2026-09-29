import {set, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyWithContentLakeSemantics, resolvePath} from './content-lake'
import {createDocument, type ActionResult, type Document} from './document'
import type {
  ChangeEvent,
  ErrorEvent,
  Load,
  MutationAccepted,
  MutationBatch,
  MutationRejected,
  MutationSent,
  Resync,
  Transaction,
} from './types'

const heldTransactionTimeout = 10_000

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
  | {type: 'ready'}

export type IoEditor = {
  /** The content on screen and the caret. */
  document: Document
  getStatus: () => IoEditorStatus
  getBase: () => Load
  on: (listener: (event: IoEditorEvent) => void) => () => void

  load: (load: Load) => void
  releaseClaim: () => void
  resync: (resync: Resync) => void
  transaction: (transaction: Transaction) => void
  mutationSent: (mutationSent: MutationSent) => void
  mutationAccepted: (mutationAccepted: MutationAccepted) => void
  mutationRejected: (mutationRejected: MutationRejected) => void
  updateReadOnly: (readOnly: boolean) => void

  setStyle: (style: string) => void
  type: (text: string) => void
  putCaretAfter: (text: string) => void
  insertBlock: (textspec: string) => void
  deleteBlock: (text: string) => void
  undo: () => void
  close: () => void

  sentBatches: Array<MutationBatch>
  changes: Array<ChangeEvent>
  errors: Array<ErrorEvent>
  warnings: Array<string>
}

type SentBatch = {
  id: string
  patches: Array<Patch>
  transactionId: string | undefined
}

type HeldTransaction = {transaction: Transaction; arrivedAt: number}

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
  const sentBatches: Array<MutationBatch> = []
  const changes: Array<ChangeEvent> = []
  const errors: Array<ErrorEvent> = []
  const warnings: Array<string> = []

  let status: IoEditorStatus = options.claimLoad ? 'loading' : 'ready'
  let base: Load = {value: undefined, rev: undefined}
  let readOnly = false
  let outOfStep = false
  let batchCounter = 0
  let inFlight: SentBatch | undefined
  let rejected: SentBatch | undefined
  let echoedAwaitingBase: Array<SentBatch> = []
  let pending: Array<Array<Patch>> = []
  let held: Array<HeldTransaction> = []
  let cancelHeldTimeout: (() => void) | undefined
  let undoSteps: Array<Array<Patch>> = []

  function emit(event: IoEditorEvent) {
    for (const listener of listeners) {
      listener(event)
    }
  }

  function warn(message: string) {
    warnings.push(message)
  }

  function load(incoming: Load) {
    if (status !== 'loading') {
      throw new Error('`load` is only accepted while the first load is claimed')
    }

    base = {value: incoming.value, rev: incoming.rev}
    queueKeyRepair(incoming.value)
    document.setValue(deriveScreen())
    becomeReady()
  }

  function releaseClaim() {
    if (status === 'loading') {
      becomeReady()
    }
  }

  function becomeReady() {
    status = 'ready'
    emit({type: 'ready'})
    flush()
  }

  function resync(incoming: Resync) {
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
    undoSteps = []
    releaseHeld()

    if (incoming.discardUnsent) {
      pending = []
    }

    queueKeyRepair(incoming.value)
    updateScreen()
    flush()
  }

  function transaction(incoming: Transaction) {
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
    const ownBatches = echoedAwaitingBase.filter(
      (batch) => batch.transactionId === incoming.transactionId,
    )
    const ownPatchIndexes = findOwnPatchIndexes(incoming.patches, ownBatches)
    const otherPatches = incoming.patches.filter(
      (_patch, index) => !ownPatchIndexes.has(index),
    )
    let nextValue = base.value

    for (const [index, patch] of incoming.patches.entries()) {
      if (
        !ownPatchIndexes.has(index) &&
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
        ...echoedAwaitingBase.filter((batch) => !ownBatches.includes(batch)),
        ...(inFlight ? [inFlight] : []),
        ...(rejected ? [rejected] : []),
      ].flatMap((batch) => batch.patches),
    )
    const collidingPatch = otherPatches.find(
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

    base = {value: nextValue, rev: incoming.resultRev}
    echoedAwaitingBase = echoedAwaitingBase.filter(
      (batch) => !ownBatches.includes(batch),
    )
    rebaseUndoSteps(otherPatches)

    if (incoming.patches.length > 0) {
      updateScreen()
    }

    return true
  }

  function fail(error: ErrorEvent): false {
    outOfStep = true
    releaseHeld()
    errors.push(error)
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

  function mutationAccepted(incoming: MutationAccepted) {
    if (!emittedBatchIds.has(incoming.id)) {
      warn(`\`mutation accepted\` for unknown batch "${incoming.id}"`)
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
  }

  function act(run: () => ActionResult) {
    if (!canEdit()) {
      return
    }

    const result = run()
    commitLocalChange(result.patches)

    if (result.patches.length > 0) {
      undoSteps = [...undoSteps, result.inversePatches]
    }
  }

  function undo() {
    const inversePatches = undoSteps.at(-1)

    if (!canEdit() || !inversePatches) {
      return
    }

    undoSteps = undoSteps.slice(0, -1)
    document.setValue(
      applyWithContentLakeSemantics(getContent(), inversePatches),
    )
    commitLocalChange(inversePatches)
  }

  function canEdit(): boolean {
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
    recordChange({operations: patches, origin: 'local'})
    flush()
  }

  function close() {
    if (status === 'unmounted') {
      return
    }

    if (pending.length > 0) {
      emitBatch({final: true})
    }

    status = 'unmounted'
    releaseHeld()
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
    sentBatches.push(batch)

    if (!final) {
      inFlight = {
        id: batch.id,
        patches: batch.patches,
        transactionId: undefined,
      }
    }

    emit({type: 'mutation', ...batch})
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
      // follow the key into it.
      document.setCaret({blockKey: caretBlockKey, offset: caret.offset})
    }

    if (!isEqual(before, after)) {
      recordChange({operations: [set(after, [])], origin: 'remote'})
    }
  }

  function deriveScreen(): Array<PortableTextBlock> | undefined {
    const unconfirmedPatches = [
      ...echoedAwaitingBase,
      ...(inFlight ? [inFlight] : []),
      ...(rejected ? [rejected] : []),
    ].flatMap((batch) => batch.patches)

    return applyWithContentLakeSemantics(base.value, [
      ...unconfirmedPatches,
      ...pending.flat(),
    ])
  }

  function rekeyPendingInserts(): Map<string, string> {
    const baseKeys = new Set(
      (base.value ?? []).flatMap((block) =>
        typeof block._key === 'string' ? [block._key] : [],
      ),
    )
    const newKeys = new Map<string, string>()

    for (const key of insertedBlockKeys(pending.flat())) {
      if (baseKeys.has(key)) {
        newKeys.set(key, keyGenerator())
      }
    }

    if (newKeys.size === 0) {
      return newKeys
    }

    pending = pending.map((patches) =>
      patches.map((patch) => renameBlockKeys(patch, newKeys)),
    )
    undoSteps = undoSteps.map((patches) =>
      patches.map((patch) => renameBlockKeys(patch, newKeys)),
    )

    return newKeys
  }

  function rebaseUndoSteps(otherPatches: Array<Patch>) {
    for (const otherPatch of otherPatches) {
      if (otherPatch.type !== 'set' && otherPatch.type !== 'unset') {
        continue
      }

      undoSteps = undoSteps.map((patches) =>
        patches.map((patch) =>
          (patch.type === 'set' || patch.type === 'unset') &&
          isEqual(patch.path, otherPatch.path)
            ? otherPatch
            : patch,
        ),
      )
    }
  }

  function queueKeyRepair(value: Array<PortableTextBlock> | undefined) {
    const repairPatches = repairKeys(value, keyGenerator)

    if (repairPatches.length > 0) {
      warn(`Repaired ${repairPatches.length} missing or duplicate keys`)
      pending = [repairPatches, ...pending]
    }
  }

  function recordChange(change: ChangeEvent) {
    changes.push(change)
    emit({type: 'change', ...change})
  }

  function getContent(): Array<PortableTextBlock> | undefined {
    return document.getPlaceholderKey() === undefined
      ? document.getValue()
      : undefined
  }

  return {
    document,
    getStatus: () => status,
    getBase: () => base,
    on: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    load,
    releaseClaim,
    resync,
    transaction,
    mutationSent,
    mutationAccepted,
    mutationRejected,
    updateReadOnly: (nextReadOnly) => {
      readOnly = nextReadOnly
    },
    setStyle: (style) => act(() => document.setStyle(style)),
    type: (text) => act(() => document.type(text)),
    putCaretAfter: (text) => document.putCaretAfter(text),
    insertBlock: (textspec) => act(() => document.insertBlock(textspec)),
    deleteBlock: (text) => act(() => document.deleteBlock(text)),
    undo,
    close,
    sentBatches,
    changes,
    errors,
    warnings,
  }
}

/**
 * The indexes of a transaction's patches that are this editor's own batches:
 * each batch's patches, found as one contiguous run.
 */
function findOwnPatchIndexes(
  patches: Array<Patch>,
  ownBatches: Array<SentBatch>,
): Set<number> {
  const indexes = new Set<number>()

  for (const batch of ownBatches) {
    const start = patches.findIndex(
      (_patch, index) =>
        !indexes.has(index) &&
        batch.patches.every((batchPatch, offset) =>
          isEqual(patches[index + offset], batchPatch),
        ),
    )

    if (start === -1) {
      continue
    }

    for (let offset = 0; offset < batch.patches.length; offset++) {
      indexes.add(start + offset)
    }
  }

  return indexes
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

function insertCollides(patch: Patch, keys: Set<string>): boolean {
  return (
    patch.type === 'insert' &&
    patch.items.some((item) => itemKey(item).some((key) => keys.has(key)))
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

/**
 * Repairs missing and duplicate keys among blocks and among each block's
 * children, keeping the first of each duplicate. Index paths address the
 * blocks, since a missing or duplicate key can't.
 */
function repairKeys(
  value: Array<PortableTextBlock> | undefined,
  keyGenerator: () => string,
): Array<Patch> {
  const patches: Array<Patch> = []
  const blockKeys = new Set<string>()

  for (const [blockIndex, block] of (value ?? []).entries()) {
    const [blockKey] = itemKey(block)

    if (blockKey === undefined || blockKeys.has(blockKey)) {
      patches.push(set(keyGenerator(), [blockIndex, '_key']))
    } else {
      blockKeys.add(blockKey)
    }

    const children: unknown = Reflect.get(block, 'children')
    const childKeys = new Set<string>()

    for (const [childIndex, child] of (Array.isArray(children)
      ? children
      : []
    ).entries()) {
      const [childKey] = itemKey(child)

      if (childKey === undefined || childKeys.has(childKey)) {
        patches.push(
          set(keyGenerator(), [blockIndex, 'children', childIndex, '_key']),
        )
      } else {
        childKeys.add(childKey)
      }
    }
  }

  return patches
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
