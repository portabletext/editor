import {set, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyWithContentLakeSemantics} from '../protocol/content-lake'

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

/**
 * The answer to a save request: saved as a new transaction, refused with a
 * 409 `transactionAlreadyExistsError` because the transaction ID is taken, or
 * refused for good because the server refused the batch.
 */
export type SubmitResult =
  | {type: 'saved'; transaction: ServerTransaction}
  | {type: 'duplicate'}
  | {type: 'refused'}

export type ServerCopy = {
  value: Array<PortableTextBlock> | undefined
  rev: string | undefined
}

export type Server = {
  documentId: string
  /**
   * Applies the batch and records a transaction, whether or not anything
   * changed. Creates the document if it doesn't exist. Throws when the
   * transaction ID is taken.
   */
  receive: (batch: SavedBatch, transactionId: string) => ServerTransaction
  /**
   * Saves the batch as `receive` does, unless the transaction ID is taken:
   * then it changes nothing and answers 409, as Content Lake does for a
   * retried request. A batch the server refused is refused again.
   */
  submit: (batch: SavedBatch, transactionId: string) => SubmitResult
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  /** The save requests refused with a 409, in the order they arrived. */
  getDuplicates: () => Array<{transactionId: string; batchIds: Array<string>}>
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
  /** Records a transaction that sets the whole field, as a script does. */
  setField: (
    value: Array<PortableTextBlock>,
    transactionId: string,
  ) => ServerTransaction
  deleteDocument: (transactionId: string) => ServerTransaction
  recreate: (
    value: Array<PortableTextBlock>,
    transactionId: string,
  ) => ServerTransaction
  copy: () => ServerCopy
  getTransactions: () => Array<ServerTransaction>
  /**
   * Every transaction in the order it was recorded, with whether it changed
   * the field.
   */
  getLog: () => Array<{transaction: ServerTransaction; changesField: boolean}>
  getTransaction: (transactionId: string) => ServerTransaction
}

/**
 * A fake Content Lake holding one document. Revisions count up from `r1`, and
 * the revision is `undefined` while the document doesn't exist.
 */
export function createFakeServer(initial: {
  documentId: string
  document: {value: Array<PortableTextBlock> | undefined} | undefined
}): Server {
  let revisionCounter = 0
  let value: Array<PortableTextBlock> | undefined
  let rev: string | undefined
  const transactions: Array<ServerTransaction> = []
  const log: Array<{transaction: ServerTransaction; changesField: boolean}> = []
  const refusedBatchIds = new Set<string>()
  const duplicates: Array<{transactionId: string; batchIds: Array<string>}> = []

  if (initial.document) {
    value = initial.document.value
    rev = nextRevision()
  }

  function hasTransaction(transactionId: string) {
    return transactions.some(
      (transaction) => transaction.transactionId === transactionId,
    )
  }

  function receiveBatches(batches: Array<SavedBatch>, transactionId: string) {
    if (hasTransaction(transactionId)) {
      throw new Error(`Transaction "${transactionId}" already exists`)
    }

    const patches = batches.flatMap((batch) => batch.patches)
    const valueBefore = value
    value = applyWithContentLakeSemantics(value, patches)

    return record(
      {
        transactionId,
        patches,
        batchIds: batches.map((batch) => batch.id),
      },
      nextRevision(),
      JSON.stringify(valueBefore) !== JSON.stringify(value),
    )
  }

  function record(
    transaction: Omit<ServerTransaction, 'previousRev' | 'resultRev'>,
    resultRev: string | undefined,
    changesField: boolean,
  ): ServerTransaction {
    const recorded = {...transaction, previousRev: rev, resultRev}
    transactions.push(recorded)
    log.push({transaction: recorded, changesField})
    rev = resultRev
    return recorded
  }

  function nextRevision() {
    revisionCounter++
    return `r${revisionCounter}`
  }

  return {
    documentId: initial.documentId,
    receive: (batch, transactionId) => receiveBatches([batch], transactionId),
    submit: (batch, transactionId) => {
      if (refusedBatchIds.has(batch.id)) {
        return {type: 'refused'}
      }

      if (hasTransaction(transactionId)) {
        duplicates.push({transactionId, batchIds: [batch.id]})
        return {type: 'duplicate'}
      }

      return {
        type: 'saved',
        transaction: receiveBatches([batch], transactionId),
      }
    },
    hasTransaction,
    getDuplicates: () => duplicates,
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

      return record(
        {transactionId, patches: [], batchIds: []},
        nextRevision(),
        false,
      )
    },
    setField: (nextValue, transactionId) => {
      if (rev === undefined) {
        throw new Error('The document does not exist')
      }

      const valueBefore = value
      value = nextValue

      return record(
        {transactionId, patches: [set(nextValue, [])], batchIds: []},
        nextRevision(),
        JSON.stringify(valueBefore) !== JSON.stringify(value),
      )
    },
    deleteDocument: (transactionId) => {
      if (rev === undefined) {
        throw new Error('The document does not exist')
      }

      const valueBefore = value
      value = undefined

      return record(
        {transactionId, patches: [unset([])], batchIds: []},
        undefined,
        valueBefore !== undefined,
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
        true,
      )
    },
    copy: () => ({value: structuredClone(value), rev}),
    getTransactions: () => transactions,
    getLog: () => log,
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
