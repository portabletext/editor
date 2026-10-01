import type {Io} from './io'
import type {Load, MutationBatch, Transaction} from './types'

export type PassThroughHost = {
  /** The transaction a batch will be saved as. */
  getTransactionId: (batchId: string) => string
  /**
   * Puts a batch in a request with other batches, saved as one transaction.
   * Only a host that folds batches does this.
   */
  mapToTransaction: (batchId: string, transactionId: string) => void
  forward: (transaction: Transaction) => void
  /** The server has taken the save request for a batch. */
  reportSaveTaken: (batchId: string) => void
  /**
   * The server saved a batch as this transaction. Only a self-confirming host
   * passes it on: any other host waits for it on the feed.
   */
  reportSaved: (transaction: Transaction) => void
  reportRejected: (batchId: string) => void
  /**
   * Re-sends a batch's save request with the transaction ID it was first sent
   * as. A 409 means the earlier attempt landed, and a save means it hadn't:
   * either way the echo confirms the batch, so the host does nothing more.
   */
  retry: (batchId: string) => 'saved' | 'duplicate' | 'refused'
  /** The listener reconnected or may have missed transactions. */
  feedLost: () => void
  load: () => void
  /**
   * `outcomeOf` names the batch in flight, whose outcome the host finds out
   * and passes along.
   */
  resync: (options: {discardUnsent: boolean; outcomeOf?: string}) => void
}

/**
 * Forwards the feed to the editor as it arrives, saves each batch, and
 * fetches the server's copy for `load` and `resync`. Waiting for the batch in
 * flight before a resync, or naming it so the host looks up its outcome, is
 * the caller's job.
 *
 * By default the host saves each batch as its own request, under the
 * transaction ID the batch proposes, and never sends `mutation sent`. With
 * `foldBatches`, the host is shaped like Studio's committer: it chooses one
 * transaction ID per request, which may carry several batches, and sends
 * `mutation sent` for each batch in it. A batch that goes out alone is saved
 * under its batch ID. The host sends `mutation sent` when the server takes
 * the save request, the last moment before the save, so a step can still fold
 * two waiting batches into one request and each batch is named once. A real
 * host decides the transaction before the request leaves and names it then.
 * The `final` batch is always saved under its proposed ID, with no
 * `mutation sent`.
 *
 * With `selfConfirming`, the host is shaped like a host with no listener and
 * one writer: it forwards the transaction each save answers with, which
 * confirms the batch, and sees no other transactions.
 *
 * The host keeps every batch's save request, so it can send it again: to
 * retry after a lost reply, and to find out what became of the batch in
 * flight before a resync. By default (`outcomeMethod: 'resubmit'`) it finds
 * the outcome by re-submitting the request under the same transaction ID: a
 * 409 means the batch had landed, a save means it hadn't and now has, both
 * `'applied'`, and a refusal for good means `'not applied'`. With
 * `outcomeMethod: 'history'` it asks the document's transaction history
 * whether the transaction ID is there instead. A lookup while the request is
 * still in transit can answer `'not applied'` for a batch that lands a moment
 * later, which re-submitting can't.
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
  io,
  save,
  resubmit,
  hasTransaction,
  fetchCopy,
  subscription,
  foldBatches = false,
  selfConfirming = false,
  outcomeMethod = 'resubmit',
}: {
  io: Io
  save: (batch: MutationBatch) => void
  /** Sends a save request again and answers whether it saved. */
  resubmit: (
    batch: MutationBatch,
    transactionId: string,
  ) => 'saved' | 'duplicate' | 'refused'
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  fetchCopy: () => Load
  subscription: () => Array<Pick<Transaction, 'transactionId' | 'resultRev'>>
  foldBatches?: boolean
  selfConfirming?: boolean
  outcomeMethod?: 'resubmit' | 'history'
}): PassThroughHost {
  const transactionIds = new Map<string, string>()
  const batches = new Map<string, MutationBatch>()
  const requestTransactionIds = new Map<string, string>()
  const unnamedBatchIds = new Set<string>()
  let inFlightBatchId: string | undefined
  let untakenBatchId: string | undefined
  let heldFinalBatch: MutationBatch | undefined
  let coveredTransactionIds = new Set<string>()
  let coveredRevs = new Set<string>()
  const previousRevs = new Map<string, string | undefined>()

  io.on((event) => {
    if (event.type !== 'mutation') {
      return
    }

    const {type: _type, ...batch} = event
    transactionIds.set(batch.id, batch.transactionId)
    batches.set(batch.id, batch)

    if (batch.final) {
      if (untakenBatchId === undefined) {
        save(batch)
      } else {
        heldFinalBatch = batch
      }

      return
    }

    if (foldBatches) {
      unnamedBatchIds.add(batch.id)
    }

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

  function forward(transaction: Transaction) {
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

    io.transaction({
      transactionId: transaction.transactionId,
      previousRev: transaction.previousRev,
      resultRev: transaction.resultRev,
      patches: transaction.patches,
    })
  }

  function resubmitBatch(batchId: string): 'saved' | 'duplicate' | 'refused' {
    const batch = batches.get(batchId)

    if (!batch || batch.final) {
      throw new Error(`No batch "${batchId}" to send again`)
    }

    return resubmit(batch, getTransactionId(batchId))
  }

  function findOutcome(batchId: string): 'applied' | 'not applied' {
    if (outcomeMethod === 'history') {
      return hasTransaction(getTransactionId(batchId))
        ? 'applied'
        : 'not applied'
    }

    return resubmitBatch(batchId) === 'refused' ? 'not applied' : 'applied'
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
      if (!foldBatches) {
        throw new Error(
          'A host that saves each batch under its proposed transaction ID never folds batches into one request',
        )
      }

      if (unnamedBatchIds.has(batchId)) {
        requestTransactionIds.set(batchId, transactionId)
        return
      }

      transactionIds.set(batchId, transactionId)
      io.mutationSent({id: batchId, transactionId})
    },
    forward,
    reportSaved: (transaction) => {
      if (selfConfirming) {
        forward(transaction)
      }
    },
    reportSaveTaken: (batchId) => {
      if (unnamedBatchIds.delete(batchId)) {
        const transactionId = requestTransactionIds.get(batchId) ?? batchId
        transactionIds.set(batchId, transactionId)
        io.mutationSent({id: batchId, transactionId})
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

      io.mutationRejected({id: batchId})
    },
    retry: resubmitBatch,
    feedLost: () => {
      io.feedLost()
    },
    load: () => {
      io.load(fetchCoveredCopy())
    },
    resync: ({discardUnsent, outcomeOf}) => {
      const outcomes =
        outcomeOf === undefined
          ? undefined
          : {[outcomeOf]: findOutcome(outcomeOf)}

      if (outcomeOf !== undefined && outcomeOf === inFlightBatchId) {
        inFlightBatchId = undefined
      }

      io.resync({
        ...fetchCoveredCopy(),
        ...(discardUnsent ? {discardUnsent: true as const} : {}),
        ...(outcomes ? {outcomes} : {}),
      })
    },
  }
}
