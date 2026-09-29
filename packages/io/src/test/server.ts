import {
  applyAll,
  set,
  unset,
  type Patch,
  type Path,
  type PathSegment,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * A batch as the server sees it: the batch ID and its patches, scoped to the
 * field.
 */
export type SavedBatch = {id: string; patches: Array<Patch>}

export type ServerTransaction = {
  transactionId: string
  previousRev: string | undefined
  resultRev: string | undefined
  patches: Array<Patch>
  batchIds: Array<string>
}

export type ServerCopy = {
  value: Array<PortableTextBlock> | undefined
  rev: string | undefined
}

export type Server = {
  documentId: string
  /**
   * Applies the batch and records a transaction, whether or not anything
   * changed. Creates the document if it doesn't exist.
   */
  receive: (batch: SavedBatch, transactionId: string) => ServerTransaction
  /** Applies both batches and records them as one transaction. */
  receiveAsOne: (
    batchA: SavedBatch,
    batchB: SavedBatch,
    transactionId: string,
  ) => ServerTransaction
  /** Refuses the batch for good. Nothing is recorded. */
  refuse: (batchId: string) => void
  isRefused: (batchId: string) => boolean
  /** Records a transaction that changes only another field of the document. */
  changeOtherField: (transactionId: string) => ServerTransaction
  deleteDocument: (transactionId: string) => ServerTransaction
  recreate: (
    value: Array<PortableTextBlock>,
    transactionId: string,
  ) => ServerTransaction
  copy: () => ServerCopy
  getTransactions: () => Array<ServerTransaction>
  getTransaction: (transactionId: string) => ServerTransaction
}

/**
 * A fake Content Lake holding one document. Revisions count up from `r1`, and
 * the revision is `undefined` while the document doesn't exist.
 */
export function createServer(initial: {
  documentId: string
  document: {value: Array<PortableTextBlock> | undefined} | undefined
}): Server {
  let revisionCounter = 0
  let value: Array<PortableTextBlock> | undefined
  let rev: string | undefined
  const transactions: Array<ServerTransaction> = []
  const refusedBatchIds = new Set<string>()

  if (initial.document) {
    value = initial.document.value
    rev = nextRevision()
  }

  function nextRevision() {
    revisionCounter++
    return `r${revisionCounter}`
  }

  function record(
    transaction: Omit<ServerTransaction, 'previousRev' | 'resultRev'>,
    resultRev: string | undefined,
  ): ServerTransaction {
    const recorded = {...transaction, previousRev: rev, resultRev}
    transactions.push(recorded)
    rev = resultRev
    return recorded
  }

  function receiveBatches(batches: Array<SavedBatch>, transactionId: string) {
    const patches = batches.flatMap((batch) => batch.patches)
    value = applyWithContentLakeSemantics(value, patches)

    return record(
      {
        transactionId,
        patches,
        batchIds: batches.map((batch) => batch.id),
      },
      nextRevision(),
    )
  }

  return {
    documentId: initial.documentId,
    receive: (batch, transactionId) => receiveBatches([batch], transactionId),
    receiveAsOne: (batchA, batchB, transactionId) =>
      receiveBatches([batchA, batchB], transactionId),
    refuse: (batchId) => {
      refusedBatchIds.add(batchId)
    },
    isRefused: (batchId) => refusedBatchIds.has(batchId),
    changeOtherField: (transactionId) => {
      if (rev === undefined) {
        throw new Error('The document does not exist')
      }

      return record({transactionId, patches: [], batchIds: []}, nextRevision())
    },
    deleteDocument: (transactionId) => {
      if (rev === undefined) {
        throw new Error('The document does not exist')
      }

      value = undefined

      return record(
        {transactionId, patches: [unset([])], batchIds: []},
        undefined,
      )
    },
    recreate: (nextValue, transactionId) => {
      if (rev !== undefined) {
        throw new Error('The document already exists')
      }

      value = nextValue

      return record(
        {transactionId, patches: [set(nextValue, [])], batchIds: []},
        nextRevision(),
      )
    },
    copy: () => ({value: structuredClone(value), rev}),
    getTransactions: () => transactions,
    getTransaction: (transactionId) => {
      const transaction = transactions.find(
        (candidate) => candidate.transactionId === transactionId,
      )

      if (!transaction) {
        throw new Error(`No transaction "${transactionId}"`)
      }

      return transaction
    },
  }
}

/**
 * Applies patches the way Content Lake does: a patch whose target is gone is
 * a no-op. `applyAll` already skips a keyed segment it can't find inside an
 * existing array, but throws when a path runs into a missing field, so those
 * patches are skipped here. Duplicate keys are stored as sent.
 */
function applyWithContentLakeSemantics(
  value: Array<PortableTextBlock> | undefined,
  patches: Array<Patch>,
): Array<PortableTextBlock> | undefined {
  return patches.reduce<Array<PortableTextBlock> | undefined>(
    (currentValue, patch) =>
      hasContainer(currentValue, patch.path)
        ? applyAll(currentValue, [patch])
        : currentValue,
    value,
  )
}

function hasContainer(value: unknown, path: Path): boolean {
  if (path.length === 0) {
    return true
  }

  let container = value

  for (const segment of path.slice(0, -1)) {
    container = resolveSegment(container, segment)
  }

  return typeof container === 'object' && container !== null
}

function resolveSegment(container: unknown, segment: PathSegment): unknown {
  if (Array.isArray(container)) {
    if (typeof segment === 'number') {
      return container[segment]
    }

    if (typeof segment === 'object' && '_key' in segment) {
      return container.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          '_key' in item &&
          item._key === segment._key,
      )
    }

    return undefined
  }

  if (
    typeof container === 'object' &&
    container !== null &&
    typeof segment === 'string'
  ) {
    return Reflect.get(container, segment)
  }

  return undefined
}
