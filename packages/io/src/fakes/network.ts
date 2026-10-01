import type {RequestFailure} from '../protocol/host'
import type {SavedBatch, ServerTransaction} from './server'

export type SaveRequest<TBatch extends SavedBatch> = {
  editorId: string
  batch: TBatch
}

/**
 * A save reply for a batch's request.
 */
export type Reply = {
  editorId: string
  batchId: string
}

/**
 * A save reply that says the request failed. A batch the server saves is
 * confirmed by its transaction coming back on the feed, so only a failure
 * travels back as a reply the host acts on.
 */
export type FailureReply = Reply & {status: RequestFailure}

/**
 * What an editor's host receives from the network.
 */
export type NetworkReceiver = {
  receiveTransaction: (transaction: ServerTransaction) => void
  receiveReply: (reply: FailureReply) => void
  /** The server has taken this editor's save request for a batch. */
  receiveSaveTaken: (batchId: string) => void
}

export type VirtualClock = {
  now: () => number
  /**
   * Moves time forward and runs every scheduled callback that falls due, in
   * due order.
   */
  advance: (milliseconds: number) => void
  /** Returns a function that cancels the callback. */
  schedule: (delay: number, callback: () => void) => () => void
}

export type Network<TBatch extends SavedBatch> = {
  clock: VirtualClock
  /**
   * `listening: false` connects a host with no feed listener: it gets save
   * replies, and its feed stays empty.
   */
  connect: (
    editorId: string,
    receiver: NetworkReceiver,
    options?: {listening: boolean},
  ) => void
  send: (editorId: string, batch: TBatch) => void
  getSaveRequests: () => Array<SaveRequest<TBatch>>
  /** Removes the request and tells the sending editor, if it is connected. */
  takeSaveRequest: (batchId: string) => SaveRequest<TBatch>
  queueReply: (reply: FailureReply) => void
  getReplies: () => Array<FailureReply>
  deliverReply: (batchId: string) => void
  /**
   * The server took and saved the batch, but its host never heard back, so
   * the host can't tell whether the save landed.
   */
  loseReply: (reply: Reply) => void
  getLostReplies: () => Array<Reply>
  /** Removes the lost reply, as when the host retries the save. */
  takeLostReply: (batchId: string) => Reply
  /** Appends the transaction to the feed of every listening editor. */
  publish: (transaction: ServerTransaction) => void
  getFeed: (editorId: string) => Array<ServerTransaction>
  deliver: (editorId: string, transactionId: string) => void
}

/**
 * Queues between the editors' hosts and the server. Nothing moves until a
 * caller takes or delivers it, in whatever order the caller asks for.
 */
export function createFakeNetwork<
  TBatch extends SavedBatch = SavedBatch,
>(): Network<TBatch> {
  const receivers = new Map<string, NetworkReceiver>()
  const feeds = new Map<string, Array<ServerTransaction>>()
  const deafEditorIds = new Set<string>()
  let saveRequests: Array<SaveRequest<TBatch>> = []
  let replies: Array<FailureReply> = []
  let lostReplies: Array<Reply> = []

  function getReceiver(editorId: string) {
    const receiver = receivers.get(editorId)

    if (!receiver) {
      throw new Error(`No editor "${editorId}" is connected`)
    }

    return receiver
  }

  return {
    clock: createVirtualClock(),
    connect: (editorId, receiver, {listening} = {listening: true}) => {
      receivers.set(editorId, receiver)
      feeds.set(editorId, [])

      if (listening) {
        deafEditorIds.delete(editorId)
      } else {
        deafEditorIds.add(editorId)
      }
    },
    send: (editorId, batch) => {
      saveRequests = [...saveRequests, {editorId, batch}]
    },
    getSaveRequests: () => saveRequests,
    takeSaveRequest: (batchId) => {
      const request = saveRequests.find(
        (candidate) => candidate.batch.id === batchId,
      )

      if (!request) {
        throw new Error(`No save request for batch "${batchId}"`)
      }

      saveRequests = saveRequests.filter((candidate) => candidate !== request)
      receivers.get(request.editorId)?.receiveSaveTaken(batchId)

      return request
    },
    queueReply: (reply) => {
      replies = [...replies, reply]
    },
    getReplies: () => replies,
    deliverReply: (batchId) => {
      const reply = replies.find((candidate) => candidate.batchId === batchId)

      if (!reply) {
        throw new Error(`No reply for batch "${batchId}"`)
      }

      replies = replies.filter((candidate) => candidate !== reply)
      getReceiver(reply.editorId).receiveReply(reply)
    },
    loseReply: (reply) => {
      if (
        lostReplies.some((candidate) => candidate.batchId === reply.batchId)
      ) {
        throw new Error(
          `The reply for batch "${reply.batchId}" is lost already`,
        )
      }

      lostReplies = [...lostReplies, reply]
    },
    getLostReplies: () => lostReplies,
    takeLostReply: (batchId) => {
      const reply = lostReplies.find(
        (candidate) => candidate.batchId === batchId,
      )

      if (!reply) {
        throw new Error(`No lost reply for batch "${batchId}"`)
      }

      lostReplies = lostReplies.filter((candidate) => candidate !== reply)

      return reply
    },
    publish: (transaction) => {
      for (const [editorId, feed] of feeds) {
        if (!deafEditorIds.has(editorId)) {
          feeds.set(editorId, [...feed, transaction])
        }
      }
    },
    getFeed: (editorId) => {
      const feed = feeds.get(editorId)

      if (!feed) {
        throw new Error(`No editor "${editorId}" is connected`)
      }

      return feed
    },
    deliver: (editorId, transactionId) => {
      const feed = feeds.get(editorId) ?? []
      const transaction = feed.find(
        (candidate) => candidate.transactionId === transactionId,
      )

      if (!transaction) {
        throw new Error(
          `No transaction "${transactionId}" waiting for editor "${editorId}"`,
        )
      }

      feeds.set(
        editorId,
        feed.filter((candidate) => candidate !== transaction),
      )
      getReceiver(editorId).receiveTransaction(transaction)
    },
  }
}

function createVirtualClock(): VirtualClock {
  let now = 0
  let nextTimerId = 0
  let timers: Array<{id: number; dueAt: number; callback: () => void}> = []

  return {
    now: () => now,
    advance: (milliseconds) => {
      const target = now + milliseconds

      while (true) {
        const [nextTimer] = timers
          .filter((timer) => timer.dueAt <= target)
          .sort(
            (timerA, timerB) =>
              timerA.dueAt - timerB.dueAt || timerA.id - timerB.id,
          )

        if (!nextTimer) {
          break
        }

        timers = timers.filter((timer) => timer !== nextTimer)
        now = nextTimer.dueAt
        nextTimer.callback()
      }

      now = target
    },
    schedule: (delay, callback) => {
      const timer = {id: nextTimerId, dueAt: now + delay, callback}
      nextTimerId++
      timers = [...timers, timer]

      return () => {
        timers = timers.filter((candidate) => candidate !== timer)
      }
    },
  }
}
