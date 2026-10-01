import {set, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyWithContentLakeSemantics} from '../protocol/content-lake'
import type {RequestFailure} from '../protocol/host'

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
 * failed with the failure the test injected.
 */
export type SubmitResult =
  | {type: 'saved'; transaction: ServerTransaction}
  | {type: 'duplicate'}
  | {type: 'failed'; status: RequestFailure}

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
   * Saves a request's batches as one transaction, as `receive` does for one,
   * unless the transaction ID is taken: then it changes nothing and answers
   * 409, as Content Lake does for a retried request. A request that meets an
   * injected failure changes nothing and fails with it.
   */
  submit: (
    batches: ReadonlyArray<SavedBatch>,
    transactionId: string,
  ) => SubmitResult
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  /** The save requests refused with a 409, in the order they arrived. */
  getDuplicates: () => Array<{transactionId: string; batchIds: Array<string>}>
  /**
   * Makes the next request `submit` gets fail with the status, whatever it
   * carries.
   */
  failNextRequest: (status: RequestFailure) => void
  /** The failure the next request meets, if one is injected. */
  getNextFailure: () => RequestFailure | undefined
  /** Records a transaction that changes only another field of the document. */
  changeOtherField: (transactionId: string) => ServerTransaction
  /**
   * Applies the patches to the field and records a transaction, as a script
   * does, whatever they leave behind.
   */
  patchField: (
    patches: Array<Patch>,
    transactionId: string,
  ) => ServerTransaction
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
  let nextFailure: RequestFailure | undefined
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

  function receiveBatches(
    batches: ReadonlyArray<SavedBatch>,
    transactionId: string,
  ) {
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
    submit: (batches, transactionId) => {
      if (nextFailure !== undefined) {
        const status = nextFailure
        nextFailure = undefined
        return {type: 'failed', status}
      }

      if (hasTransaction(transactionId)) {
        duplicates.push({
          transactionId,
          batchIds: batches.map((batch) => batch.id),
        })
        return {type: 'duplicate'}
      }

      return {
        type: 'saved',
        transaction: receiveBatches(batches, transactionId),
      }
    },
    hasTransaction,
    getDuplicates: () => duplicates,
    failNextRequest: (status) => {
      nextFailure = status
    },
    getNextFailure: () => nextFailure,
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
    patchField: (patches, transactionId) => {
      if (rev === undefined) {
        throw new Error('The document does not exist')
      }

      const valueBefore = value
      value = applyWithContentLakeSemantics(value, patches)

      return record(
        {transactionId, patches, batchIds: []},
        nextRevision(),
        JSON.stringify(valueBefore) !== JSON.stringify(value),
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
