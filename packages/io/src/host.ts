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
  reportRejected: (batchId: string) => void
  /**
   * Re-sends a batch's save request with the transaction ID it was first sent
   * as. A 409 means the earlier attempt landed, and a save means it hadn't:
   * either way the echo confirms the batch, so the host does nothing more.
   */
  retry: (batchId: string) => 'saved' | 'duplicate'
  /** The listener reconnected or may have missed transactions. */
  feedLost: () => void
  load: () => void
  /**
   * `outcomeOf` names the batch in flight, whose outcome the host looks up
   * in the document's transaction history and passes along.
   */
  resync: (options: {discardUnsent: boolean; outcomeOf?: string}) => void
}

/**
 * Forwards the feed to the editor as it arrives, saves each batch as the
 * transaction named by its batch ID, and fetches the server's copy for `load`
 * and `resync`. Waiting for the batch in flight before a resync, or naming it
 * so the host looks up its outcome, is the caller's job.
 *
 * The host sends `mutation sent` when the server takes the save request, the
 * last moment before the save, so a step can still fold two waiting batches
 * into one transaction and each batch is named once. A real host decides the
 * transaction before the request leaves and names it then.
 *
 * `subscription` returns what the host's feed subscription holds but hasn't
 * delivered yet, in server order. The host subscribes before it fetches a
 * copy, so at that moment those transactions run up to the one whose
 * `resultRev` is the copy's revision, and the host drops them when they
 * arrive. The model's feed can deliver out of order, so arrival order can't
 * tell a covered transaction from one that skipped ahead.
 *
 * The host also remembers every transaction it has seen, forwarded or
 * dropped, as a link from its `previousRev` to its `resultRev`. A copy at
 * revision `R` covers `R` and every revision reachable backwards from it
 * through known links. A transaction arriving later whose `resultRev` is
 * covered is dropped, and its `previousRev` becomes covered too. A late
 * covered transaction that neither the subscription nor a known link ties to
 * the copy can't be told from one that skipped ahead, so it is forwarded, and
 * the editor holds it for 10 s before it reports `out of order`.
 */
export function createPassThroughHost({
  editor,
  save,
  resubmit,
  hasTransaction,
  fetchCopy,
  subscription,
}: {
  editor: IoEditor
  save: (batch: MutationBatch) => void
  /** Sends a save request again and answers whether it saved. */
  resubmit: (
    batch: MutationBatch,
    transactionId: string,
  ) => 'saved' | 'duplicate'
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  fetchCopy: () => Load
  subscription: () => Array<Pick<Transaction, 'transactionId' | 'resultRev'>>
}): PassThroughHost {
  const transactionIds = new Map<string, string>()
  const batches = new Map<string, MutationBatch>()
  const unnamedBatchIds = new Set<string>()
  let inFlightBatchId: string | undefined
  let untakenBatchId: string | undefined
  let heldFinalBatch: MutationBatch | undefined
  let coveredTransactionIds = new Set<string>()
  let coveredRevs = new Set<string>()
  const previousRevs = new Map<string, string | undefined>()

  editor.on((event) => {
    if (event.type !== 'mutation') {
      return
    }

    const {type: _type, ...batch} = event
    transactionIds.set(batch.id, batch.id)
    batches.set(batch.id, batch)

    if (batch.final) {
      if (untakenBatchId === undefined) {
        save(batch)
      } else {
        heldFinalBatch = batch
      }

      return
    }

    unnamedBatchIds.add(batch.id)
    inFlightBatchId = batch.id
    untakenBatchId = batch.id
    save(batch)
  })

  function fetchCoveredCopy(): Load {
    const copy = fetchCopy()

    if (inFlightBatchId !== undefined) {
      return copy
    }

    coveredRevs = revsUpTo(copy.rev)

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

  function revsUpTo(rev: string | undefined): Set<string> {
    const revs = new Set<string>()
    let current = rev

    while (current !== undefined && !revs.has(current)) {
      revs.add(current)
      current = previousRevs.get(current)
    }

    return revs
  }

  function isCovered(transaction: Transaction): boolean {
    const coveredById = coveredTransactionIds.delete(transaction.transactionId)

    return (
      coveredById ||
      (transaction.resultRev !== undefined &&
        coveredRevs.has(transaction.resultRev))
    )
  }

  function getTransactionId(batchId: string): string {
    const transactionId = transactionIds.get(batchId)

    if (transactionId === undefined) {
      throw new Error(`No batch "${batchId}" was saved`)
    }

    return transactionId
  }

  return {
    getTransactionId,
    mapToTransaction: (batchId, transactionId) => {
      transactionIds.set(batchId, transactionId)

      if (!unnamedBatchIds.has(batchId)) {
        editor.mutationSent({id: batchId, transactionId})
      }
    },
    forward: (transaction) => {
      if (transaction.resultRev !== undefined) {
        previousRevs.set(transaction.resultRev, transaction.previousRev)
      }

      if (isCovered(transaction)) {
        if (transaction.previousRev !== undefined) {
          coveredRevs.add(transaction.previousRev)
        }

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
      if (unnamedBatchIds.delete(batchId)) {
        editor.mutationSent({
          id: batchId,
          transactionId: getTransactionId(batchId),
        })
      }

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
    reportRejected: (batchId) => {
      if (batchId === inFlightBatchId) {
        inFlightBatchId = undefined
      }

      editor.mutationRejected({id: batchId})
    },
    retry: (batchId) => {
      const batch = batches.get(batchId)

      if (!batch || batch.final) {
        throw new Error(`No batch "${batchId}" to retry`)
      }

      return resubmit(batch, getTransactionId(batchId))
    },
    feedLost: () => {
      editor.feedLost()
    },
    load: () => {
      editor.load(fetchCoveredCopy())
    },
    resync: ({discardUnsent, outcomeOf}) => {
      const outcomes =
        outcomeOf === undefined
          ? undefined
          : {
              [outcomeOf]: hasTransaction(getTransactionId(outcomeOf))
                ? ('applied' as const)
                : ('not applied' as const),
            }

      if (outcomeOf !== undefined && outcomeOf === inFlightBatchId) {
        inFlightBatchId = undefined
      }

      editor.resync({
        ...fetchCoveredCopy(),
        ...(discardUnsent ? {discardUnsent: true as const} : {}),
        ...(outcomes ? {outcomes} : {}),
      })
    },
  }
}
