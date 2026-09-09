import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {isNormalizing} from '../engine/editor/is-normalizing'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorActor} from './editor-machine'
import type {Relay} from './relay'

type PendingMutation = {
  operationId?: string
  value: Array<PortableTextBlock> | undefined
  patches: Array<Patch>
  // Whether any patch in this bulk is editable-time user work: neither an
  // intake repair nor read-only. Local edits are impossible while
  // read-only, and an intake repair patch is never user work regardless of
  // when the batcher receives it (`setup`'s deferred-events replay can
  // hand it over after the editor has already left read-only), so a bulk
  // with neither holds only repairs the engine re-derives from whatever
  // value arrives next; it needs no snapshot protection.
  accumulatedWhileEditable: boolean
  // The generation current when this bulk was created. `currentGeneration`
  // bumps when a value-sync pass starts, not when it ends, so it marks
  // which pass (if any) was in progress at creation. `dropSupersededRepairs`
  // drops a non-editable bulk once its generation falls behind the
  // current one, proving it wasn't minted by the pass that's now settling.
  // A bulk tagged with the current generation was minted during the pass
  // that's now settling (the pass's own repair re-mints included), so it's
  // exempt regardless of `accumulatedWhileEditable`; a repair minted
  // between passes (remote-patch fallout) carries an older generation and
  // gets no such exemption.
  generation: number
  // The block an intake-repair bulk repairs, derived from its patches'
  // first path segment. `undefined` for a non-repair bulk, and also for an
  // intake-repair bulk whose block couldn't be resolved (a numeric first
  // segment with no value snapshot to index into): that bulk falls back to
  // sharing the generation-only cull every other bulk gets. Distinct block
  // keys never merge into the same bulk, so a repair superseded for one
  // block can't smuggle a stale repair for another out past the cull.
  intakeRepairBlockKey: string | undefined
}

function deriveIntakeRepairBlockKey(
  patch: Patch,
  value: Array<PortableTextBlock> | undefined,
): string | undefined {
  const [firstSegment] = patch.path

  if (isKeyedSegment(firstSegment)) {
    return firstSegment._key
  }

  if (typeof firstSegment === 'number') {
    return value?.[firstSegment]?._key
  }

  return undefined
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
 * bulks keyed by `operationId` (and, for intake-repair patches, also by
 * the block they repair, so repairs for different blocks never share a
 * bulk) and flush as `mutation` events on an interval, or eagerly when
 * typing stops or a non-typing operation applies, except while the editor
 * is read-only: hosts following the documented `onChange` contract reject
 * mutations against a read-only document, so bulks hold and flush on the
 * first tick after the editor becomes editable again.
 *
 * `editorEngine.isDeferringMutations` reflects only bulks that hold at
 * least one editable-time user-work patch: that's the unflushed work a
 * remote snapshot must not clobber. A patch counts as user work only when
 * the editor was editable AND the patch isn't an intake repair (a
 * normalization fix minted while adopting a remote value, tagged
 * `intakeRepair` at emission so classification survives `setup`'s
 * deferred-events replay landing after read-only has already lifted). A
 * bulk made entirely of read-only and/or intake-repair patches carries
 * nothing worth protecting, so it never sets the flag.
 *
 * `editorEngine.notifyInboundSyncStarted` bumps `currentGeneration` when
 * a value-sync pass starts, before that pass's own invoked sync can mint
 * anything. Marking pass membership at the start rather than the end
 * matters: a repair minted between passes (remote-patch fallout, fired
 * from inside the `patches` remote frame's own normalization, outside any
 * settling pass) is minted before the *next* pass's bump, so it carries
 * that older generation and is judged like any other held repair instead
 * of masquerading as the next pass's own mint.
 *
 * `editorEngine.notifyInboundStateApplied` runs this batcher's
 * `dropSupersededRepairs`, passed the set of block keys the sync pass
 * found still echoing their pre-repair shape: once an inbound value sync
 * has settled, a held repair bulk with no editable-time patch is
 * superseded (the full snapshot either already contains its repair or
 * still echoes it, both proven per block by the echoed-block-keys set, or
 * the bulk carries the generation this pass bumped to at its start,
 * proving the pass's own normalization re-minted it) and is dropped
 * instead of flushing. Only value syncs drop superseded repairs: a remote
 * patch batch is a delta that can change engine state without superseding
 * a held repair, so it must leave held bulks alone.
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
  // Bumped by `notifyInboundSyncStarted` when a value-sync pass starts,
  // not by `dropSupersededRepairs` when one ends: a bulk only ever
  // carries the generation current at its own creation, so tagging pass
  // *start* is what makes a bulk's generation mean "minted during this
  // pass" rather than "minted before the next pass's cull happened to
  // run", which a fallout repair minted between passes would otherwise
  // satisfy by accident. A bulk left behind by an older generation (one
  // that has since seen a later pass start) is unambiguously stale, and
  // `handlePatch` below refuses to extend it with a newer generation's
  // patch.
  let currentGeneration = 0

  function isReadOnly() {
    return editorActor.getSnapshot().matches({'edit mode': 'read only'})
  }

  function handlePatch(event: {
    patch: Patch
    operationId?: string
    value: Array<PortableTextBlock>
    intakeRepair: boolean
  }) {
    // An intake repair is never editable-user work, no matter what the
    // actor state reads at receipt: `setup` defers the events that carry
    // it and replays them after the editor has already left read-only, so
    // receipt-time state can't tell a startup repair from a real edit.
    const accumulatedWhileEditable = !isReadOnly() && !event.intakeRepair
    const intakeRepairBlockKey = event.intakeRepair
      ? deriveIntakeRepairBlockKey(event.patch, event.value)
      : undefined

    relay.send({type: 'patch', patch: event.patch})

    const lastBulk = pendingMutations.at(-1)

    // Two intake-repair patches for different blocks never share a bulk,
    // even sharing the same `operationId` (`undefined` is common outside
    // a behavior, and normalization can repair several broken blocks in
    // the same pass): otherwise a later block's repair, superseded on its
    // own, would flush riding along with an earlier block's still-live
    // one. A non-repair patch merges by `operationId` exactly as before,
    // regardless of what an earlier repair in the same bulk claimed.
    const blockKeyMismatch =
      event.intakeRepair &&
      lastBulk?.intakeRepairBlockKey !== undefined &&
      lastBulk.intakeRepairBlockKey !== intakeRepairBlockKey

    if (
      lastBulk &&
      !blockKeyMismatch &&
      lastBulk.operationId === event.operationId &&
      lastBulk.generation === currentGeneration
    ) {
      lastBulk.value = event.value
      lastBulk.patches.push(event.patch)
      lastBulk.accumulatedWhileEditable ||= accumulatedWhileEditable
    } else {
      pendingMutations.push({
        operationId: event.operationId,
        value: event.value,
        patches: [event.patch],
        accumulatedWhileEditable,
        generation: currentGeneration,
        intakeRepairBlockKey,
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

  // Called after every value sync pass, and only then: a full snapshot
  // either already contains a held repair, the pass re-minted it (that
  // re-mint carries the generation this pass's own `notifyInboundSyncStarted`
  // bump set, matching `currentGeneration` here), or the pass's snapshot
  // still echoes the pre-repair shape for that specific block (in which
  // case the pass reports the block's key in `echoedBlockKeys`), which is
  // what makes dropping safe (a remote patch batch proves none of these,
  // so it never drops anything). A bulk still tagged with an older
  // generation, whose block (if it has one) isn't in this pass's echoed
  // set, held nothing but a repair the settled state has superseded (or a
  // between-pass fallout repair this pass's snapshot has moved past), so
  // it's dropped.
  function dropSupersededRepairs(echoedBlockKeys: Set<string>) {
    pendingMutations = pendingMutations.filter(
      (bulk) =>
        bulk.accumulatedWhileEditable ||
        bulk.generation === currentGeneration ||
        (bulk.intakeRepairBlockKey !== undefined &&
          echoedBlockKeys.has(bulk.intakeRepairBlockKey)),
    )
    updateIsDeferringMutations()
  }

  editorEngine.notifyInboundSyncStarted = () => {
    currentGeneration++
  }
  editorEngine.notifyInboundStateApplied = dropSupersededRepairs

  function flush({ignoreReadOnly = false}: {ignoreReadOnly?: boolean} = {}) {
    if (pendingMutations.length === 0) {
      if (flushInterval !== undefined) {
        clearInterval(flushInterval)
        flushInterval = undefined
      }
      return
    }

    if ((isReadOnly() && !ignoreReadOnly) || !isNormalizing(editorEngine)) {
      // Leave the interval running: read-only-held mutations flush on the
      // first tick after the editor becomes editable again.
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
