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
  // Whether any patch in this bulk arrived while the editor was editable.
  // Local edits are impossible while read-only, so a bulk accumulated
  // entirely during read-only holds only repairs the engine re-derives
  // from whatever value arrives next; it needs no snapshot protection.
  accumulatedWhileEditable: boolean
  // The cull generation current when this bulk was created. `cull` drops
  // a non-editable bulk once its generation falls behind the current one,
  // proving some later inbound state applied after this bulk stopped
  // accumulating. A bulk tagged with the current generation is what the
  // application that just triggered `cull` itself produced, so it's
  // exempt regardless of `accumulatedWhileEditable`.
  generation: number
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

/**
 * Batches `internal.patch` events into debounced `mutation` events.
 *
 * Individual `patch` events relay to consumers immediately, including
 * while the editor is read-only. The patches themselves accumulate into
 * bulks keyed by `operationId` and flush as `mutation` events on an
 * interval, or eagerly when typing stops or a non-typing operation
 * applies, except while the editor is read-only: hosts following the
 * documented `onChange` contract reject mutations against a read-only
 * document, so bulks hold and flush on the first tick after the editor
 * becomes editable again.
 *
 * `editorEngine.isDeferringMutations` reflects only bulks that hold at
 * least one patch accumulated while the editor was editable: that's the
 * unflushed user work a remote snapshot must not clobber. A bulk made
 * entirely of patches accumulated while read-only (a repair the engine
 * emitted on intake, since local edits are impossible while read-only)
 * carries nothing worth protecting, so it never sets the flag.
 *
 * `editorEngine.notifyInboundStateApplied` runs this batcher's cull: once
 * an inbound value sync or applied remote-patches batch has settled, a
 * held bulk with no editable-time patch is superseded (its repair no
 * longer describes the state the document just settled on; if that state
 * is still broken, normalization has already re-emitted a fresh repair
 * bulk, which the cull leaves alone) and is dropped instead of flushing.
 *
 * The flush interval keeps running when a flush bails on its guard and is
 * only cleared once pending work has actually drained. Both guard
 * branches rely on this: read-only-held mutations flush on the first
 * tick after the editor becomes editable, and work arriving while
 * normalization is suppressed flushes on the first tick after the
 * `withoutNormalizing` block exits.
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
  let flushInterval: ReturnType<typeof setInterval> | undefined
  let typeDebounce: ReturnType<typeof setTimeout> | undefined
  let isTyping = false
  // Bumped once per `cull` call, after the drop it performs. A bulk only
  // ever carries the generation current at its own creation, so a bulk
  // left behind by an older generation (one that has since had its own
  // `cull` call) is unambiguously stale, and `handlePatch` below refuses
  // to extend it with a newer generation's patch.
  let currentGeneration = 0

  function isReadOnly() {
    return editorActor.getSnapshot().matches({'edit mode': 'read only'})
  }

  function handlePatch(event: {
    patch: Patch
    operationId?: string
    value: Array<PortableTextBlock>
  }) {
    const arrivedWhileEditable = !isReadOnly()

    relay.send({type: 'patch', patch: event.patch})

    const lastBulk = pendingMutations.at(-1)

    if (
      lastBulk &&
      lastBulk.operationId === event.operationId &&
      lastBulk.generation === currentGeneration
    ) {
      lastBulk.value = event.value
      lastBulk.patches.push(event.patch)
      lastBulk.accumulatedWhileEditable ||= arrivedWhileEditable
    } else {
      pendingMutations.push({
        operationId: event.operationId,
        value: event.value,
        patches: [event.patch],
        accumulatedWhileEditable: arrivedWhileEditable,
        generation: currentGeneration,
      })
    }

    updateIsDeferringMutations()

    if (flushInterval === undefined) {
      flushInterval = setInterval(flush, FLUSH_INTERVAL)
    }
  }

  function updateIsDeferringMutations() {
    editorEngine.isDeferringMutations = pendingMutations.some(
      (bulk) => bulk.accumulatedWhileEditable,
    )
  }

  // Called once an inbound value sync or applied remote-patches batch has
  // settled, whether or not it changed anything: a bulk still tagged with
  // an older generation held nothing but a repair the engine re-derives
  // from the state that just settled, so it's dropped; the generation
  // bump after the drop closes this pass off, so a later patch sharing
  // this pass's `operationId` (both `undefined` is common outside a
  // behavior) starts a fresh bulk instead of extending a survivor.
  function cull() {
    pendingMutations = pendingMutations.filter(
      (bulk) =>
        bulk.accumulatedWhileEditable || bulk.generation === currentGeneration,
    )
    updateIsDeferringMutations()
    currentGeneration++
  }

  editorEngine.notifyInboundStateApplied = cull

  function flush({ignoreReadOnly = false}: {ignoreReadOnly?: boolean} = {}) {
    if ((isReadOnly() && !ignoreReadOnly) || !isNormalizing(editorEngine)) {
      // Leave the interval running: read-only-held mutations flush on the
      // first tick after the editor becomes editable again.
      return
    }

    if (pendingMutations.length === 0) {
      return
    }

    const mutations = pendingMutations
    pendingMutations = []

    if (flushInterval !== undefined) {
      clearInterval(flushInterval)
      flushInterval = undefined
    }

    updateIsDeferringMutations()

    for (const bulk of mutations) {
      editorActor.send({
        type: 'mutation',
        patches: bulk.patches,
        value: bulk.value,
      })
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
        // Re-mounted with pending mutations from before the unmount:
        // resume the flush cadence.
        flushInterval = setInterval(flush, FLUSH_INTERVAL)
      }

      return () => {
        // Flush pending mutations before unmounting, while the
        // editor-actor-to-relay routing is still subscribed, ignoring the
        // read-only guard: a host tearing down a read-only editor (e.g. on
        // disconnect) must still receive work typed just before the
        // flip, or it's lost for good. The normalizing branch of the guard
        // cannot bail at this point: `normalizing` is only ever `false`
        // inside a synchronous `withoutNormalizing` block, which no effect
        // cleanup can interleave with.
        flush({ignoreReadOnly: true})

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
