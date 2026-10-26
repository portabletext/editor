import type {Patch} from '@portabletext/patches'
import {diffValue} from './diff'
import type {EditorMessageForIo, IoEvent, IoMessage, IoOutOfStep} from './types'
import {applyLocal, applyRemote, isEqual, type Value} from './value'

export type Transaction = Extract<IoMessage, {type: 'transaction'}>

export type SentMutation = {
  id: string
  transactionId: string
  patches: Array<Patch>
}

/**
 * `base` is the server's copy at `base.rev` and is never edited locally:
 * a rejection or a resync rebuilds what the editor shows from it.
 */
export type IoContext = {
  loaded: boolean
  base: {value: Value; rev: string | undefined}
  revs: Array<string>
  shown: Value
  mutationCount: number
  inFlight: SentMutation | undefined
  pending: Array<Array<Patch>>
  held: Array<Transaction>
  outOfStep: IoOutOfStep | undefined
}

export type IoEmitted =
  | IoEvent
  | {type: 'editor message'; message: EditorMessageForIo}
  | {type: 'violation'; input: string}

export type Outcome = {context: IoContext; emitted: Array<IoEmitted>}

export function createContext(): IoContext {
  return {
    loaded: false,
    base: {value: undefined, rev: undefined},
    revs: [],
    shown: undefined,
    mutationCount: 0,
    inFlight: undefined,
    pending: [],
    held: [],
    outOfStep: undefined,
  }
}

export function load(
  context: IoContext,
  message: Extract<IoMessage, {type: 'load'}>,
): Outcome {
  return {
    context: {
      ...context,
      loaded: true,
      base: {value: message.value, rev: message.rev},
      revs: message.rev === undefined ? [] : [message.rev],
      shown: message.value,
    },
    emitted: [
      {type: 'editor message', message: {type: 'load', value: message.value}},
    ],
  }
}

/**
 * Applies the held transactions that follow on from the base, in chain
 * order. Revisions are opaque, so a held transaction counts as already in
 * the base only by ancestry: on ready, every held transaction that leads
 * to the loaded revision is dropped, whatever order it arrived in.
 */
export function takeHeld(
  context: IoContext,
  options: {onReady: boolean},
): Outcome {
  let held = options.onReady
    ? withoutAncestorsOf(context.held, context.base.rev)
    : context.held

  let current = context
  const emitted: Array<IoEmitted> = []

  while (current.outOfStep === undefined) {
    const revs = current.revs
    held = held.filter((transaction) => !revs.includes(transaction.resultRev))
    const base = current.base
    const next = held.find(
      (transaction) => transaction.previousRev === base.rev,
    )

    if (next === undefined) {
      break
    }

    held = held.filter((transaction) => transaction !== next)
    const outcome = advance(current, next)
    current = outcome.context
    emitted.push(...outcome.emitted)
  }

  return {
    context: {...current, held: current.outOfStep ? [] : held},
    emitted,
  }
}

function withoutAncestorsOf(
  held: Array<Transaction>,
  rev: string | undefined,
): Array<Transaction> {
  const ancestors = new Set<Transaction>()
  let descendant = rev
  let parent = held.find((transaction) => transaction.resultRev === descendant)

  while (parent !== undefined && !ancestors.has(parent)) {
    ancestors.add(parent)
    descendant = parent.previousRev
    parent = held.find((transaction) => transaction.resultRev === descendant)
  }

  return held.filter((transaction) => !ancestors.has(transaction))
}

export function receiveTransaction(
  context: IoContext,
  transaction: Transaction,
): Outcome {
  if (context.revs.includes(transaction.resultRev)) {
    return {context, emitted: []}
  }

  if (transaction.previousRev !== context.base.rev) {
    return {
      context: {...context, held: [...context.held, transaction]},
      emitted: [],
    }
  }

  const advanced = advance(context, transaction)
  const rest = takeHeld(advanced.context, {onReady: false})

  return {
    context: rest.context,
    emitted: [...advanced.emitted, ...rest.emitted],
  }
}

function advance(context: IoContext, transaction: Transaction): Outcome {
  const inFlight = context.inFlight
  const isOwnEcho = inFlight?.transactionId === transaction.transactionId

  if (
    isOwnEcho &&
    !isEqual(
      withoutOrigin(transaction.patches),
      withoutOrigin(inFlight.patches),
    )
  ) {
    return outOfStep({...context, inFlight: undefined}, 'echo mismatch')
  }

  const applied = applyRemote(context.base.value, transaction.patches)

  if (applied === undefined) {
    return outOfStep(context, 'patch failed')
  }

  const emitted: Array<IoEmitted> = []

  if (isOwnEcho) {
    const {dropped} = applyLocal(context.base.value, inFlight.patches)

    if (dropped.length > 0) {
      emitted.push({
        type: 'work dropped',
        patches: dropped,
        reason: 'no target',
      })
    }
  }

  return rebase(
    {
      ...context,
      base: {value: applied.value, rev: transaction.resultRev},
      revs: [...context.revs, transaction.resultRev],
      inFlight: isOwnEcho ? undefined : inFlight,
    },
    {reason: 'no target', emitted, editorMessage: 'apply'},
  )
}

export function outOfStep(
  context: IoContext,
  reason: IoOutOfStep['reason'],
): Outcome {
  return {context: {...context, outOfStep: {reason}, held: []}, emitted: []}
}

export function reject(context: IoContext): Outcome {
  if (context.inFlight === undefined) {
    return {context, emitted: []}
  }

  return rebase(
    {...context, inFlight: undefined},
    {
      reason: 'rejected',
      emitted: [
        {
          type: 'work dropped',
          patches: context.inFlight.patches,
          reason: 'rejected',
        },
      ],
      editorMessage: 'apply',
    },
  )
}

export function resync(
  context: IoContext,
  message: Extract<IoMessage, {type: 'resync'}>,
): Outcome {
  const inFlight = context.inFlight
  const pending =
    inFlight !== undefined && message.outcomes?.[inFlight.id] === 'not applied'
      ? [inFlight.patches, ...context.pending]
      : context.pending

  return rebase(
    {
      ...context,
      base: {value: message.value, rev: message.rev},
      revs: message.rev === undefined ? [] : [message.rev],
      inFlight: undefined,
      pending,
      held: [],
      outOfStep: undefined,
    },
    {reason: 'no target', emitted: [], editorMessage: 'resync'},
  )
}

function rebase(
  context: IoContext,
  options: {
    reason: 'no target' | 'rejected'
    emitted: Array<IoEmitted>
    editorMessage: 'apply' | 'resync'
  },
): Outcome {
  let value = applyLocal(
    context.base.value,
    context.inFlight?.patches ?? [],
  ).value
  const pending: Array<Array<Patch>> = []
  const dropped: Array<Patch> = []

  for (const change of context.pending) {
    const result = applyLocal(value, change)
    value = result.value
    dropped.push(...result.dropped)

    const kept =
      result.dropped.length === 0
        ? change
        : change.filter((patch) => !result.dropped.includes(patch))

    if (kept.length > 0) {
      pending.push(kept)
    }
  }

  const emitted = [...options.emitted]

  if (dropped.length > 0) {
    emitted.push({
      type: 'work dropped',
      patches: dropped,
      reason: options.reason,
    })
  }

  if (options.editorMessage === 'resync') {
    emitted.push({
      type: 'editor message',
      message: {type: 'resync', value},
    })
  } else {
    const patches = diffValue(context.shown, value)

    if (patches.length > 0) {
      emitted.push({type: 'editor message', message: {type: 'apply', patches}})
    }
  }

  return {context: {...context, pending, shown: value}, emitted}
}

export function queueChange(
  context: IoContext,
  patches: Array<Patch>,
): Outcome {
  return {
    context: {
      ...context,
      pending: [...context.pending, patches],
      shown: applyLocal(context.shown, patches).value,
    },
    emitted: [],
  }
}

export function sendPending(context: IoContext): Outcome {
  const inFlight = {
    id: String(context.mutationCount + 1),
    transactionId: randomTransactionId(),
    patches: context.pending.flat(),
  }

  return {
    context: {
      ...context,
      mutationCount: context.mutationCount + 1,
      inFlight,
      pending: [],
    },
    emitted: [{type: 'mutation', ...inFlight}],
  }
}

/**
 * Hands the pending changes over at once as the final mutation. The host
 * sends it after the mutation in flight settles, so io never waits on the
 * network to close.
 */
export function handOver(context: IoContext): Outcome {
  if (context.pending.length === 0) {
    return {context, emitted: []}
  }

  const {context: next, emitted} = sendPending(context)

  return {
    context: {...next, inFlight: context.inFlight},
    emitted: emitted.map((event) =>
      event.type === 'mutation' ? {...event, final: true} : event,
    ),
  }
}

export function nameTransaction(
  context: IoContext,
  message: Extract<IoMessage, {type: 'mutation sent'}>,
): Outcome {
  if (context.inFlight?.id !== message.id) {
    return {context, emitted: []}
  }

  return {
    context: {
      ...context,
      inFlight: {...context.inFlight, transactionId: message.transactionId},
    },
    emitted: [],
  }
}

/**
 * Editors stamp their patches with an `origin` that the listener does not
 * carry back, so an own echo is compared without it.
 */
function withoutOrigin(patches: Array<Patch>): Array<Patch> {
  return patches.map(({origin: _origin, ...patch}) => patch as Patch)
}

/**
 * A fresh UUID per mutation: the server treats a transaction ID it has
 * seen before as already applied. `crypto.randomUUID` is missing outside
 * secure contexts, where `crypto.getRandomValues` still works.
 */
function randomTransactionId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
