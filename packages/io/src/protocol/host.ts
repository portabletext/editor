import type {Io} from './io'
import type {Load, Mutation, Transaction} from './types'

/**
 * A save request as the host formed it: the transaction ID and every mutation
 * it carries. It never changes once formed: every retry and every re-submit
 * sends it as it is.
 */
export type FrozenRequest = {
  readonly transactionId: string
  readonly mutations: ReadonlyArray<Mutation>
}

/**
 * Why a save request failed: an HTTP status, or a network error before any
 * answer. A 400, 403 or 404 means the server will never save the request,
 * and the others that a later attempt may.
 */
export type RequestFailure = 400 | 403 | 404 | 500 | 503 | 'network error'

/**
 * The answer to a save request: saved, refused with a 409
 * `transactionAlreadyExistsError` because the transaction ID is taken, or
 * failed.
 */
export type SaveAnswer =
  | {type: 'saved'}
  | {type: 'duplicate'}
  | {type: 'failed'; status: RequestFailure}

export type PassThroughHost = {
  /**
   * The transaction a mutation is saved as, or the one it proposes while a
   * folding host hasn't formed its request yet.
   */
  getTransactionId: (mutationId: string) => string
  /** The request a mutation is saved in, formed now if it wasn't yet. */
  getRequest: (mutationId: string) => FrozenRequest
  /**
   * Forms the request a mutation goes out in, with other mutations, saved as one
   * transaction. Only a host that folds mutations does this, and only once per
   * mutation: folding a mutation again into the same request does nothing.
   */
  foldIntoRequest: (mutationId: string, request: FrozenRequest) => void
  forward: (transaction: Transaction) => void
  /** The server has taken the save request for a mutation. */
  reportSaveTaken: (mutationId: string) => void
  /**
   * The server saved a mutation as this transaction. Only a self-confirming host
   * passes it on: any other host waits for it on the feed.
   */
  reportSaved: (mutationId: string, transaction: Transaction) => void
  /**
   * A mutation's save request failed. A permanent failure is reported to the
   * editor as `mutation rejected`, and a transient one is retried.
   */
  reportFailure: (mutationId: string, status: RequestFailure) => void
  /**
   * Re-sends the request a mutation was saved in, as it was formed, again after
   * each transient failure. A 409 means the earlier attempt landed, and a
   * save means it hadn't: either way the echo confirms the mutation, so the host
   * does nothing more. A permanent failure is reported as
   * `mutation rejected`.
   */
  retry: (mutationId: string) => SaveAnswer
  /** The listener reconnected or may have missed transactions. */
  feedLost: () => void
  load: () => void
  /**
   * `outcomeOf` names the mutation in flight, whose outcome the host finds out
   * and passes along.
   */
  resync: (options: {discardUnsent: boolean; outcomeOf?: string}) => void
}

/**
 * Forwards the feed to the editor as it arrives, saves each mutation, and
 * fetches the server's copy for `load` and `resync`. Waiting for the mutation in
 * flight before a resync, or naming it so the host looks up its outcome, is
 * the caller's job.
 *
 * By default the host saves each mutation as its own request, under the
 * transaction ID the mutation proposes, and never sends `mutation sent`, so
 * each transaction carries one mutation. With `foldMutations`, the host is
 * shaped like Studio's committer: it chooses one transaction ID per request,
 * and sends `mutation sent` for each mutation in it. Its transaction can
 * carry several mutations. A mutation that goes out alone is saved under its
 * mutation ID. The host forms a mutation's request, and sends
 * `mutation sent`, at the first of: a step folding it with other mutations,
 * the server taking it, or the host re-sending it. Until then a step can
 * still fold two waiting mutations into one request. A real host forms the
 * request before it leaves. The `final` mutation is always saved under its
 * proposed ID, with no `mutation sent`.
 *
 * With `selfConfirming`, the host is shaped like a host with no listener and
 * one writer: it forwards the transaction each save answers with, which
 * confirms the mutation, and sees no other transactions.
 *
 * The host keeps every request it formed, so it can send it again, whole and
 * under the same transaction ID: to retry after a lost reply or a transient
 * failure, and to find out what became of the mutation in flight before a
 * resync. By default (`outcomeMethod: 'resubmit'`) it finds the outcome by
 * re-submitting the request: a 409 means the mutation had landed, a save means
 * it hadn't and now has, both `'applied'`, and a permanent failure means
 * `'not applied'`. With `outcomeMethod: 'history'` it asks the document's transaction history
 * whether the transaction ID is there instead. A lookup while the request is
 * still in transit can answer `'not applied'` for a mutation that lands a moment
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
  foldMutations = false,
  selfConfirming = false,
  outcomeMethod = 'resubmit',
}: {
  io: Io
  save: (mutation: Mutation) => void
  /** Sends a save request again and answers whether it saved. */
  resubmit: (request: FrozenRequest) => SaveAnswer
  /** Whether the document's transaction history lists the ID. */
  hasTransaction: (transactionId: string) => boolean
  fetchCopy: () => Load
  subscription: () => Array<Pick<Transaction, 'transactionId' | 'resultRev'>>
  foldMutations?: boolean
  selfConfirming?: boolean
  outcomeMethod?: 'resubmit' | 'history'
}): PassThroughHost {
  const mutations = new Map<string, Mutation>()
  const requests = new Map<string, FrozenRequest>()
  let inFlightMutationId: string | undefined
  let untakenMutationId: string | undefined
  let heldFinalMutation: Mutation | undefined
  let coveredTransactionIds = new Set<string>()
  let coveredRevs = new Set<string>()
  const previousRevs = new Map<string, string | undefined>()

  io.on('mutation', (event) => {
    const {type: _type, ...mutation} = event
    mutations.set(mutation.id, mutation)

    if (mutation.final || !foldMutations) {
      requests.set(
        mutation.id,
        freezeRequest({
          transactionId: mutation.transactionId,
          mutations: [mutation],
        }),
      )
    }

    if (mutation.final) {
      if (untakenMutationId === undefined) {
        save(mutation)
      } else {
        heldFinalMutation = mutation
      }

      return
    }

    inFlightMutationId = mutation.id
    untakenMutationId = mutation.id
    save(mutation)
  })

  function fetchCoveredCopy(): Load {
    const copy = fetchCopy()

    if (inFlightMutationId !== undefined) {
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
      inFlightMutationId !== undefined &&
      requests.get(inFlightMutationId)?.transactionId ===
        transaction.transactionId
    ) {
      inFlightMutationId = undefined
    }

    io.send({
      type: 'transaction',
      transactionId: transaction.transactionId,
      previousRev: transaction.previousRev,
      resultRev: transaction.resultRev,
      patches: transaction.patches,
      ...('value' in transaction ? {value: transaction.value} : {}),
    })
  }

  function resubmitMutation(mutationId: string): SaveAnswer {
    if (getMutation(mutationId).final) {
      throw new Error(`No mutation "${mutationId}" to send again`)
    }

    return resubmitUntilAnswered(mutationId)
  }

  function resubmitUntilAnswered(mutationId: string): SaveAnswer {
    let answer = resubmit(getRequest(mutationId))

    while (answer.type === 'failed' && !isPermanent(answer.status)) {
      answer = resubmit(getRequest(mutationId))
    }

    return answer
  }

  function reject(mutationId: string) {
    if (getMutation(mutationId).final) {
      return
    }

    if (mutationId === inFlightMutationId) {
      inFlightMutationId = undefined
    }

    io.send({type: 'mutation rejected', id: mutationId})
  }

  function findOutcome(mutationId: string): 'applied' | 'not applied' {
    if (outcomeMethod === 'history') {
      return hasTransaction(getRequest(mutationId).transactionId)
        ? 'applied'
        : 'not applied'
    }

    return resubmitMutation(mutationId).type === 'failed'
      ? 'not applied'
      : 'applied'
  }

  function getMutation(mutationId: string): Mutation {
    const mutation = mutations.get(mutationId)

    if (!mutation) {
      throw new Error(`No mutation "${mutationId}" was saved`)
    }

    return mutation
  }

  function getTransactionId(mutationId: string): string {
    return (
      requests.get(mutationId)?.transactionId ??
      getMutation(mutationId).transactionId
    )
  }

  function getRequest(mutationId: string): FrozenRequest {
    const request = requests.get(mutationId)

    if (request) {
      return request
    }

    const mutation = getMutation(mutationId)

    return formRequest(mutationId, {
      transactionId: mutation.id,
      mutations: [mutation],
    })
  }

  function formRequest(
    mutationId: string,
    request: FrozenRequest,
  ): FrozenRequest {
    const frozen = freezeRequest(request)
    requests.set(mutationId, frozen)
    io.send({
      type: 'mutation sent',
      id: mutationId,
      transactionId: frozen.transactionId,
    })

    return frozen
  }

  return {
    getTransactionId,
    getRequest,
    foldIntoRequest: (mutationId, request) => {
      if (!foldMutations) {
        throw new Error(
          'A host that saves each mutation under its proposed transaction ID never folds mutations into one request',
        )
      }

      if (!request.mutations.some((mutation) => mutation.id === mutationId)) {
        throw new Error(`The request does not carry mutation "${mutationId}"`)
      }

      const formed = requests.get(mutationId)

      if (formed === undefined) {
        formRequest(mutationId, request)
        return
      }

      if (!isSameRequest(formed, request)) {
        throw new Error(
          `Mutation "${mutationId}" went out in request "${formed.transactionId}" already`,
        )
      }
    },
    forward,
    reportSaved: (mutationId, transaction) => {
      if (selfConfirming && !getMutation(mutationId).final) {
        forward(transaction)
      }
    },
    reportSaveTaken: (mutationId) => {
      getRequest(mutationId)

      if (mutationId !== untakenMutationId) {
        return
      }

      untakenMutationId = undefined

      if (heldFinalMutation) {
        const finalMutation = heldFinalMutation
        heldFinalMutation = undefined
        save(finalMutation)
      }
    },
    reportFailure: (mutationId, status) => {
      if (
        isPermanent(status) ||
        resubmitUntilAnswered(mutationId).type === 'failed'
      ) {
        reject(mutationId)
      }
    },
    retry: (mutationId) => {
      const answer = resubmitMutation(mutationId)

      if (answer.type === 'failed') {
        reject(mutationId)
      }

      return answer
    },
    feedLost: () => {
      io.send({type: 'feed lost'})
    },
    load: () => {
      io.send({type: 'load', ...fetchCoveredCopy()})
    },
    resync: ({discardUnsent, outcomeOf}) => {
      const outcomes =
        outcomeOf === undefined
          ? undefined
          : {[outcomeOf]: findOutcome(outcomeOf)}

      if (outcomeOf !== undefined && outcomeOf === inFlightMutationId) {
        inFlightMutationId = undefined
      }

      io.send({
        type: 'resync',
        ...fetchCoveredCopy(),
        ...(discardUnsent ? {discardUnsent: true as const} : {}),
        ...(outcomes ? {outcomes} : {}),
      })
    },
  }
}

function isPermanent(status: RequestFailure): boolean {
  return status === 400 || status === 403 || status === 404
}

function freezeRequest(request: FrozenRequest): FrozenRequest {
  return Object.freeze({
    transactionId: request.transactionId,
    mutations: Object.freeze([...request.mutations]),
  })
}

function isSameRequest(requestA: FrozenRequest, requestB: FrozenRequest) {
  return (
    requestA.transactionId === requestB.transactionId &&
    requestA.mutations.length === requestB.mutations.length &&
    requestA.mutations.every(
      (mutation, index) => mutation.id === requestB.mutations[index]?.id,
    )
  )
}
