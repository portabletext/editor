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

const FLUSH_INTERVAL =
  // @ts-expect-error - dot notation required for Vite to replace at build time
  process.env.NODE_ENV === 'test' ? 250 : 1000

/**
 * Batches `internal.patch` events into debounced `mutation` events.
 *
 * Individual `patch` events relay to consumers immediately (deferred while
 * the editor is read-only); the patches themselves accumulate into bulks
 * keyed by `operationId` and flush as `mutation` events on an interval, or
 * eagerly when typing stops or a non-typing operation applies.
 *
 * The flush interval keeps running when a flush bails on its guard and is
 * only cleared once pending work has actually drained. Both guard branches
 * rely on this: read-only-deferred mutations flush on the first tick after
 * the editor becomes editable, and work arriving while normalization is
 * suppressed flushes on the first tick after the `withoutNormalizing`
 * block exits.
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

  function flush() {
    if (isReadOnly() || !isNormalizing(editorEngine)) {
      // Leave the interval running: read-only-deferred mutations flush on
      // the first tick after the editor becomes editable again.
      return
    }

    if (pendingPatchEvents.length === 0 && pendingMutations.length === 0) {
      return
    }

    const patchEvents = pendingPatchEvents
    const mutations = pendingMutations
    pendingPatchEvents = []
    pendingMutations = []

    if (flushInterval !== undefined) {
      clearInterval(flushInterval)
      flushInterval = undefined
    }

    for (const patch of patchEvents) {
      relay.send({type: 'patch', patch})
    }

    editorEngine.isDeferringMutations = false

    for (const bulk of mutations) {
      // The editor machine still gates mutations through its setup states
      // and re-emits them to the relay.
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
        // block, which no effect cleanup can interleave with.
        flush()

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
