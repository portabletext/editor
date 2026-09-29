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
 */
export function createPassThroughHost({
  editor,
  save,
  fetchCopy,
}: {
  editor: IoEditor
  save: (batch: MutationBatch) => void
  fetchCopy: () => Load
}): PassThroughHost {
  const transactionIds = new Map<string, string>()

  editor.on((event) => {
    if (event.type !== 'mutation') {
      return
    }

    const {type: _type, ...batch} = event
    transactionIds.set(batch.id, batch.id)

    if (!batch.final) {
      editor.mutationSent({id: batch.id, transactionId: batch.id})
    }

    save(batch)
  })

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
      editor.transaction({
        transactionId: transaction.transactionId,
        previousRev: transaction.previousRev,
        resultRev: transaction.resultRev,
        patches: transaction.patches,
      })
    },
    reportAccepted: (batchId) => {
      editor.mutationAccepted({id: batchId})
    },
    reportRejected: (batchId) => {
      editor.mutationRejected({id: batchId})
    },
    load: () => {
      editor.load(fetchCopy())
    },
    resync: ({discardUnsent}) => {
      editor.resync({
        ...fetchCopy(),
        ...(discardUnsent ? {discardUnsent: true as const} : {}),
      })
    },
  }
}
