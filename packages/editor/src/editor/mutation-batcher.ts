import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {isNormalizing} from '../engine/editor/is-normalizing'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import type {Relay} from './relay'

type PendingMutation = {
  operationId?: string
  value: Array<PortableTextBlock> | undefined
  patches: Array<Patch>
}

const TYPE_DEBOUNCE = 250

// A typed burst splits into two mutations mid-word if this fixed flush cadence
// fires before the burst finishes typing, so in test mode the interval has to
// be comfortably longer than a real burst takes to type. It also can't be too
// long: the interval is the flush path for non-typing pending work, and tests
// wait on those mutations within a default 1s `waitFor`. 500ms balances both —
// a burst must take over 500ms to type to split, while non-typing work still
// flushes well inside 1s. Production never approaches its 1s cadence.
const FLUSH_INTERVAL =
  // @ts-expect-error - dot notation required for Vite to replace at build time
  process.env.NODE_ENV === 'test' ? 500 : 1000

// How long a flushed batch may sit unacknowledged before the gate stops
// waiting and degrades to send-anyway. Echoes from a working host arrive
// in-process, within milliseconds; only a broken echo loop (a patch
// dropped or rewritten in transit) ever reaches this. The test value must
// comfortably exceed the window the negative-assertion tests hold a gated
// batch open across (a type debounce, a flush interval, and a ~900ms
// sleep), so a held batch is provably gated, not merely slow.
const ACK_TIMEOUT =
  // @ts-expect-error - dot notation required for Vite to replace at build time
  process.env.NODE_ENV === 'test' ? 3000 : 5000

/**
 * Batches `internal.patch` events into debounced `mutation` events.
 *
 * Individual `patch` events relay to consumers immediately (deferred while
 * the editor is read-only); the patches themselves accumulate into bulks
 * keyed by `operationId` and flush as `mutation` events on an interval, or
 * eagerly when typing stops or a non-typing operation applies.
 *
 * Once the host has proven it echoes the editor's own patches back (the
 * first successful `mutationLedger` acknowledgment), mutations flush one
 * batch at a time: the next batch holds until every patch of the previous
 * one is echoed back, or until `ACK_TIMEOUT` passes and the gate degrades
 * to send-anyway (clearing the ledger: those echoes are not coming). A
 * host that never echoes (a snapshot-only integration) never activates
 * the gate and keeps today's fire-and-forget cadence.
 *
 * The flush interval keeps running when a flush bails on its guard and is
 * only cleared once pending work has actually drained. All guard branches
 * rely on this: read-only-deferred mutations flush on the first tick after
 * the editor becomes editable, work arriving while normalization is
 * suppressed flushes on the first tick after the `withoutNormalizing`
 * block exits, and an ack-gated batch flushes on the first tick after the
 * backlog drains or times out (draining also flushes eagerly via
 * `onAcknowledge`).
 */
export function createMutationBatcher({
  editorActor,
  editorEngine,
  relay,
}: {
  editorActor: EditorActor
  editorEngine: PortableTextEditorEngine
  relay: Relay
}): {
  subscribe: () => () => void
} {
  // Closure state lives outside `subscribe` so pending work survives a
  // StrictMode unmount/remount, like the persisted actor snapshot did.
  let pendingMutations: Array<PendingMutation> = []
  let pendingPatchEvents: Array<Patch> = []
  let flushInterval: ReturnType<typeof setInterval> | undefined
  let typeDebounce: ReturnType<typeof setTimeout> | undefined
  let isTyping = false
  // Flips on the first successful ledger acknowledgment and never back:
  // one echoed patch proves the host round-trips the editor's own patches,
  // so from then on missing echoes mean something is in flight (or broken),
  // never that the channel does not exist.
  let hostEchoes = false
  let inFlightSince: number | undefined

  editorEngine.mutationLedger.onAcknowledge = () => {
    hostEchoes = true
    if (editorEngine.mutationLedger.unacknowledged().length === 0) {
      inFlightSince = undefined
      flush()
    }
  }

  function isReadOnly() {
    return editorActor.getSnapshot().matches({'edit mode': 'read only'})
  }

  function handlePatch(event: {
    patch: Patch
    operationId?: string
    value: Array<PortableTextBlock>
  }) {
    editorEngine.isDeferringMutations = true

    if (isReadOnly()) {
      pendingPatchEvents.push(event.patch)
    } else {
      relay.send({type: 'patch', patch: event.patch})
    }

    const lastBulk = pendingMutations.at(-1)

    if (lastBulk && lastBulk.operationId === event.operationId) {
      lastBulk.value = event.value
      lastBulk.patches.push(event.patch)
    } else {
      pendingMutations.push({
        operationId: event.operationId,
        value: event.value,
        patches: [event.patch],
      })
    }

    if (flushInterval === undefined) {
      flushInterval = setInterval(flush, FLUSH_INTERVAL)
    }
  }

  function flush({ignoreAckGate = false}: {ignoreAckGate?: boolean} = {}) {
    if (isReadOnly() || !isNormalizing(editorEngine)) {
      // Leave the interval running: read-only-deferred mutations flush on
      // the first tick after the editor becomes editable again.
      return
    }

    if (pendingPatchEvents.length === 0 && pendingMutations.length === 0) {
      return
    }

    // Deferred patch events relay ahead of the ack gate: they are
    // informational and hosts mirror them for display, so an in-flight
    // unacknowledged batch must never delay them. Only `mutation`
    // delivery is paced.
    const patchEvents = pendingPatchEvents
    pendingPatchEvents = []
    for (const patch of patchEvents) {
      relay.send({type: 'patch', patch})
    }

    if (pendingMutations.length === 0) {
      if (flushInterval !== undefined) {
        clearInterval(flushInterval)
        flushInterval = undefined
      }
      return
    }

    if (
      !ignoreAckGate &&
      hostEchoes &&
      editorEngine.mutationLedger.unacknowledged().length > 0
    ) {
      if (
        inFlightSince !== undefined &&
        Date.now() - inFlightSince < ACK_TIMEOUT
      ) {
        // Leave the interval running: the gated work flushes on the first
        // tick after the backlog drains or the wait times out.
        return
      }
      // The echoes aren't coming (dropped or rewritten in transit):
      // degrade to send-anyway rather than stall saving.
      console.warn(
        'Mutation patches were not echoed back within the acknowledgment window. The host may have dropped or rewritten them; sending the next mutation without confirmation.',
        editorEngine.mutationLedger.unacknowledged(),
      )
      editorEngine.mutationLedger.clear()
    }

    const mutations = pendingMutations
    pendingMutations = []

    if (flushInterval !== undefined) {
      clearInterval(flushInterval)
      flushInterval = undefined
    }

    editorEngine.isDeferringMutations = false

    for (const bulk of mutations) {
      editorEngine.mutationLedger.record(bulk.patches)
      // The editor machine still gates mutations through its setup states
      // and re-emits them to the relay.
      editorActor.send({
        type: 'mutation',
        patches: bulk.patches,
        value: bulk.value,
      })
    }

    if (mutations.length > 0) {
      inFlightSince = Date.now()
    }
  }

  function handleOperation(operationType: string) {
    if (operationType === 'insert.text' || operationType === 'remove.text') {
      isTyping = true

      if (typeDebounce !== undefined) {
        clearTimeout(typeDebounce)
      }
      typeDebounce = setTimeout(() => {
        isTyping = false
        typeDebounce = undefined
        flush()
      }, TYPE_DEBOUNCE)

      return
    }

    if (isTyping) {
      // A non-typing operation ends the typing session and flushes before
      // the operation's own patches arrive — this runs in the operation
      // channel's `before` phase.
      isTyping = false
      if (typeDebounce !== undefined) {
        clearTimeout(typeDebounce)
        typeDebounce = undefined
      }
      flush()
    }
  }

  return {
    subscribe: () => {
      const patchSubscription = editorActor.on('internal.patch', handlePatch)
      const unsubscribeFromOperations = subscribeToOperations(
        editorEngine,
        (event) => {
          handleOperation(event.operation.type)
        },
        {phase: 'before'},
      )

      if (pendingMutations.length > 0 && flushInterval === undefined) {
        // Re-mounted with work deferred from before the unmount (e.g. a
        // read-only editor): resume the flush cadence.
        flushInterval = setInterval(flush, FLUSH_INTERVAL)
      }

      return () => {
        // Flush pending patches and mutations before unmounting, while the
        // editor-actor-to-relay routing is still subscribed. A read-only
        // editor's deferred work intentionally stays unemitted here —
        // read-only deferral holds through teardown. The normalizing
        // branch of the guard cannot bail at this point: `normalizing` is
        // only ever `false` inside a synchronous `withoutNormalizing`
        // block, which no effect cleanup can interleave with. The ack gate
        // is ignored: there is no later tick to deliver on, so a gated
        // batch is sent rather than lost.
        flush({ignoreAckGate: true})

        patchSubscription.unsubscribe()
        unsubscribeFromOperations()

        if (flushInterval !== undefined) {
          clearInterval(flushInterval)
          flushInterval = undefined
        }
        if (typeDebounce !== undefined) {
          clearTimeout(typeDebounce)
          typeDebounce = undefined
        }
        isTyping = false
      }
    },
  }
}
