import {set, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyWithContentLakeSemantics} from '../protocol/content-lake'
import type {RequestFailure} from '../protocol/host'

/**
 * A mutation as the server sees it: the mutation ID and its patches, scoped to the
 * field.
 */
export type SavedMutation = {id: string; patches: Array<Patch>}

export type ServerTransaction = {
  transactionId: string
  previousRev: string | undefined
  resultRev: string | undefined
  patches: Array<Patch>
  mutationIds: Array<string>
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
   * Applies the mutation and records a transaction, whether or not anything
   * changed. Creates the document if it doesn't exist. Throws when the
   * transaction ID is taken.
   */
  receive: (mutation: SavedMutation, transactionId: string) => ServerTransaction
  /**
   * Saves a request's mutations as one transaction, as `receive` does for one,
   * unless the transaction ID is taken: then it changes nothing and answers
   * 409, as Content Lake does for a retried request. A request that meets an
   * injected failure changes nothing and fails with it.
   */
  submit: (
    mutations: ReadonlyArray<SavedMutation>,
    transactionId: string,
  ) => SubmitResult
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  /** The save requests refused with a 409, in the order they arrived. */
  getDuplicates: () => Array<{
    transactionId: string
    mutationIds: Array<string>
  }>
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
  /** The field as it was right after the transaction. */
  getCopyAfter: (transactionId: string) => Array<PortableTextBlock> | undefined
  /**
   * Applies the patches to the stored field without recording a
   * transaction, whether or not one was recorded before. The copy after the
   * latest transaction, if there is one, then holds a change its patches
   * don't.
   */
  alterStoredCopy: (patches: Array<Patch>) => void
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
  const copiesAfter = new Map<string, Array<PortableTextBlock> | undefined>()
  const log: Array<{transaction: ServerTransaction; changesField: boolean}> = []
  let nextFailure: RequestFailure | undefined
  const duplicates: Array<{transactionId: string; mutationIds: Array<string>}> =
    []

  if (initial.document) {
    value = initial.document.value
    rev = nextRevision()
  }

  function hasTransaction(transactionId: string) {
    return transactions.some(
      (transaction) => transaction.transactionId === transactionId,
    )
  }

  function receiveMutations(
    mutations: ReadonlyArray<SavedMutation>,
    transactionId: string,
  ) {
    if (hasTransaction(transactionId)) {
      throw new Error(`Transaction "${transactionId}" already exists`)
    }

    const patches = mutations.flatMap((mutation) => mutation.patches)
    const valueBefore = value
    value = applyWithContentLakeSemantics(value, patches)

    return record(
      {
        transactionId,
        patches,
        mutationIds: mutations.map((mutation) => mutation.id),
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
    copiesAfter.set(recorded.transactionId, structuredClone(value))
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
    receive: (mutation, transactionId) =>
      receiveMutations([mutation], transactionId),
    submit: (mutations, transactionId) => {
      if (nextFailure !== undefined) {
        const status = nextFailure
        nextFailure = undefined
        return {type: 'failed', status}
      }

      if (hasTransaction(transactionId)) {
        duplicates.push({
          transactionId,
          mutationIds: mutations.map((mutation) => mutation.id),
        })
        return {type: 'duplicate'}
      }

      return {
        type: 'saved',
        transaction: receiveMutations(mutations, transactionId),
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
        {transactionId, patches: [], mutationIds: []},
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
        {transactionId, patches, mutationIds: []},
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
        {transactionId, patches: [set(nextValue, [])], mutationIds: []},
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
        {transactionId, patches: [unset([])], mutationIds: []},
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
        {transactionId, patches: [set(nextValue, [])], mutationIds: []},
        nextRevision(),
        true,
      )
    },
    copy: () => ({value: structuredClone(value), rev}),
    getCopyAfter: (transactionId) => {
      if (!copiesAfter.has(transactionId)) {
        throw new Error(`No transaction "${transactionId}"`)
      }

      return structuredClone(copiesAfter.get(transactionId))
    },
    alterStoredCopy: (patches) => {
      const latest = transactions.at(-1)

      value = applyWithContentLakeSemantics(value, patches)

      if (latest) {
        copiesAfter.set(latest.transactionId, structuredClone(value))
      }
    },
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
