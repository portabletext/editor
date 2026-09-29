import type {IoEditor} from './editor'
import type {Load, MutationBatch, Transaction} from './types'

export type PassThroughHost = {
  /** The transaction a batch will be saved as. */
  getTransactionId: (batchId: string) => string
  /**
   * Saves a batch as another transaction, as when several batches go out in
   * one request, and tells the editor before the request goes out.
   */
  mapToTransaction: (batchId: string, transactionId: string) => void
  forward: (transaction: Transaction) => void
  /** The server has taken the save request for a batch. */
  reportSaveTaken: (batchId: string) => void
  reportAccepted: (batchId: string) => void
  reportRejected: (batchId: string) => void
  load: () => void
  resync: (options: {discardUnsent: boolean}) => void
}

/**
 * Forwards the feed to the editor as it arrives, saves each batch as the
 * transaction named by its batch ID, and fetches the server's copy for `load`
 * and `resync`. Waiting for the batch in flight before a resync is the
 * caller's job.
 *
 * `subscription` returns what the host's feed subscription holds but hasn't
 * delivered yet, in server order. The host subscribes before it fetches a
 * copy, so at that moment those transactions run up to the one whose
 * `resultRev` is the copy's revision, and the host drops them when they
 * arrive. The model's feed can deliver out of order, so arrival order can't
 * tell a covered transaction from one that skipped ahead.
 */
export function createPassThroughHost({
  editor,
  save,
  fetchCopy,
  subscription,
}: {
  editor: IoEditor
  save: (batch: MutationBatch) => void
  fetchCopy: () => Load
  subscription: () => Array<Pick<Transaction, 'transactionId' | 'resultRev'>>
}): PassThroughHost {
  const transactionIds = new Map<string, string>()
  let inFlightBatchId: string | undefined
  let untakenBatchId: string | undefined
  let heldFinalBatch: MutationBatch | undefined
  let coveredTransactionIds = new Set<string>()

  editor.on((event) => {
    if (event.type !== 'mutation') {
      return
    }

    const {type: _type, ...batch} = event
    transactionIds.set(batch.id, batch.id)

    if (batch.final) {
      if (untakenBatchId === undefined) {
        save(batch)
      } else {
        heldFinalBatch = batch
      }

      return
    }

    editor.mutationSent({id: batch.id, transactionId: batch.id})
    inFlightBatchId = batch.id
    untakenBatchId = batch.id
    save(batch)
  })

  function fetchCoveredCopy(): Load {
    const copy = fetchCopy()

    if (inFlightBatchId !== undefined) {
      return copy
    }

    const buffered = subscription()
    const lastCoveredIndex = buffered.findLastIndex(
      (transaction) => transaction.resultRev === copy.rev,
    )
    coveredTransactionIds = new Set(
      buffered
        .slice(0, lastCoveredIndex + 1)
        .map((transaction) => transaction.transactionId),
    )

    return copy
  }

  return {
    getTransactionId: (batchId) => {
      const transactionId = transactionIds.get(batchId)

      if (transactionId === undefined) {
        throw new Error(`No batch "${batchId}" was saved`)
      }

      return transactionId
    },
    mapToTransaction: (batchId, transactionId) => {
      transactionIds.set(batchId, transactionId)
      editor.mutationSent({id: batchId, transactionId})
    },
    forward: (transaction) => {
      if (coveredTransactionIds.delete(transaction.transactionId)) {
        return
      }

      if (
        inFlightBatchId !== undefined &&
        transactionIds.get(inFlightBatchId) === transaction.transactionId
      ) {
        inFlightBatchId = undefined
      }

      editor.transaction({
        transactionId: transaction.transactionId,
        previousRev: transaction.previousRev,
        resultRev: transaction.resultRev,
        patches: transaction.patches,
      })
    },
    reportSaveTaken: (batchId) => {
      if (batchId !== untakenBatchId) {
        return
      }

      untakenBatchId = undefined

      if (heldFinalBatch) {
        const finalBatch = heldFinalBatch
        heldFinalBatch = undefined
        save(finalBatch)
      }
    },
    reportAccepted: (batchId) => {
      editor.mutationAccepted({id: batchId})
    },
    reportRejected: (batchId) => {
      if (batchId === inFlightBatchId) {
        inFlightBatchId = undefined
      }

      editor.mutationRejected({id: batchId})
    },
    load: () => {
      editor.load(fetchCoveredCopy())
    },
    resync: ({discardUnsent}) => {
      editor.resync({
        ...fetchCoveredCopy(),
        ...(discardUnsent ? {discardUnsent: true as const} : {}),
      })
    },
  }
}
