import type {
  Decoration,
  DecorationMapping,
  Editor,
  EditorSelection,
} from '@portabletext/editor'
import {assertUniqueDecorationIds} from './assert-unique-decoration-ids'
import {cloneRange} from './clone-range'
import type {DecorationEvent, DecorationLayer} from './decoration.types'
import {isDeepEqual} from './equality'

export type DecorationsLayerInternals = {
  subscribe: (callback: () => void) => () => void
}

/**
 * `useDecorations` needs a way to subscribe to a layer's `current`
 * without that subscribe function joining the public, proposal-shaped
 * `DecorationLayer` type. Keyed by the layer handle's own identity.
 */
const layerInternals = new WeakMap<DecorationLayer, DecorationsLayerInternals>()

export function getDecorationsLayerInternals(
  layer: DecorationLayer,
): DecorationsLayerInternals | undefined {
  return layerInternals.get(layer)
}

/**
 * `useDecorationLayer`'s facade handle registers itself here too, so
 * `useDecorations` resolves it exactly like a real layer.
 */
export function setDecorationsLayerInternals(
  layer: DecorationLayer,
  internals: DecorationsLayerInternals,
): void {
  layerInternals.set(layer, internals)
}

/**
 * @beta
 *
 * Creates a decoration layer on `editor.registerDecorations`, adding
 * batched `on` events (one call per settled change) and `current`, a
 * snapshot of the layer's live, edit-adjusted positions. `unregister()`
 * removes the layer. Inside React components, use `useDecorationLayer`
 * instead: it manages the same layer over the component lifecycle.
 */
export function createDecorationLayer(
  editor: Editor,
  options: {
    decorations: Array<Decoration>
    on?: (events: Array<DecorationEvent>) => void
  },
): DecorationLayer {
  let unregistered = false
  // Cloning each decoration's `range` (not just the array) means an
  // in-place mutation of a caller's range object, followed by an
  // `update()` call with the same decoration object, still lands on a
  // changed value here: the reconcile loop below compares against this
  // mirror, not the caller's own objects.
  let currentDecorations = cloneDecorations(options.decorations)
  let currentCache: DecorationLayer['current'] = []
  const subscribers = new Set<() => void>()

  function notifySubscribers() {
    for (const callback of subscribers) {
      callback()
    }
  }

  function recomputeCurrent() {
    const next = registration.getDecorations()

    // `current`'s reference is documented stable between changes: a burst
    // that nets to the same positions (or a fully-unchanged `update()`)
    // must not hand out a new array, or every dependency array watching
    // it would re-run for nothing.
    if (isDeepEqual(next, currentCache)) {
      return
    }

    currentCache = next
    notifySubscribers()
  }

  const batcher = createDecorationsBatcher({
    getDecorations: () => currentDecorations,
    onFlush: (events) => {
      recomputeCurrent()

      if (events.length === 0) {
        return
      }

      try {
        options.on?.(events)
      } catch (error) {
        // A throwing layer handler must not stop another layer's from
        // being delivered; each layer flushes on its own microtask, so
        // this only guards against the error surfacing as unhandled.
        console.error(error)
      }
    },
  })

  const registration = editor.registerDecorations({
    decorations: options.decorations,
    onMapped: batcher.push,
  })
  recomputeCurrent()

  // No per-op nudge from core primes a layer registered before `ready`
  // (see `DecorationRegistration.getDecorations`'s own contract): re-read
  // once the editor settles so `current` (and any `useDecorations`
  // subscriber) catches up without waiting for either an edit or an
  // `update()`.
  const readySubscription = editor.on('ready', () => recomputeCurrent())

  const layer: DecorationLayer = {
    update: (decorations) => {
      if (unregistered) {
        return
      }

      assertUniqueDecorationIds(decorations)

      // Dropping an id entirely, or re-pointing it to a changed `range`,
      // resolves (deliberately) whatever an in-flight operation queued
      // for it, except a re-pointed id with a queued `lost`: the
      // machine's reconciliation treats a resupply of the range a
      // decoration died under as a redundant no-op (stays dead), so only
      // the post-reconcile snapshot says whether this re-anchor actually
      // revived it or it's still dead. Genuinely revived: drop the
      // now-stale `lost`. Still dead: keep it queued so it still
      // delivers.
      const nextById = new Map(
        decorations.map((decoration) => [decoration.id, decoration]),
      )
      const idsToDropNow: Array<string> = []
      const repointedIdsWithPendingLost: Array<string> = []

      for (const previous of currentDecorations) {
        const next = nextById.get(previous.id)

        if (!next || isDeepEqual(previous.range, next.range)) {
          if (!next) {
            idsToDropNow.push(previous.id)
          }
          continue
        }

        if (batcher.hasPendingLost(previous.id)) {
          repointedIdsWithPendingLost.push(previous.id)
        } else {
          idsToDropNow.push(previous.id)
        }
      }

      batcher.dropPending(idsToDropNow)

      currentDecorations = cloneDecorations(decorations)
      registration.update(decorations)

      if (repointedIdsWithPendingLost.length > 0) {
        const liveIds = new Set(
          registration.getDecorations().map((decoration) => decoration.id),
        )

        batcher.dropPending(
          repointedIdsWithPendingLost.filter((id) => liveIds.has(id)),
        )
      }

      recomputeCurrent()
    },
    unregister: () => {
      if (unregistered) {
        return
      }

      unregistered = true
      batcher.destroy()
      readySubscription.unsubscribe()
      registration.unregister()
      currentCache = []
      notifySubscribers()
    },
    get current() {
      return currentCache
    },
  }

  layerInternals.set(layer, {
    subscribe: (callback) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
  })

  return layer
}

function cloneDecorations(decorations: Array<Decoration>): Array<Decoration> {
  return decorations.map((decoration) => ({
    ...decoration,
    range: cloneRange(decoration.range),
  }))
}

type DecorationsBatchLeg = {
  origin: 'local' | 'remote'
  latestRange: NonNullable<EditorSelection> | undefined
  movedPreviousRange: NonNullable<EditorSelection> | undefined
  movedOrigin: 'local' | 'remote' | undefined
  contentChangedOrigin: 'local' | 'remote' | undefined
  lost:
    | {previousRange: NonNullable<EditorSelection>; origin: 'local' | 'remote'}
    | undefined
}

type DecorationsBatchEntry = {
  decoration: Decoration | undefined
  // Legs already closed by an origin change within this burst, oldest
  // first, each destined for its own flushed event.
  closedLegs: Array<DecorationsBatchLeg>
  // The leg still accumulating mappings of its own origin; absent until
  // the id's first mapping in this burst.
  openLeg: DecorationsBatchLeg | undefined
}

/**
 * Coalesces core's raw, per-operation `onMapped` mappings into one call
 * per settled burst (the trailing-microtask pattern also used by the
 * relay's `{batch: true}` listeners, see `editor`'s `relay.ts`). A
 * mapping folds into this layer's vocabulary by shape alone, since core
 * carries no event-type discriminant: `newRange === null` is `lost`;
 * `newRange !== previousRange` (by reference) is a `moved` leg;
 * `contentTouched` is a `content-changed` leg.
 *
 * Mappings fold per origin run, not per decoration: consecutive
 * mappings sharing an origin fold into the same leg (at most one
 * `moved`, one `content-changed`, and never both alongside a `lost`),
 * but a mapping whose origin differs from the open leg's closes that
 * leg (it becomes its own event at flush) and starts a fresh one. A
 * mapping's own `previousRange` already tracks the decoration's live
 * position right before that operation, so the new leg chains from
 * where the closed one ended without any extra bookkeeping. A decoration
 * touched by both origins in one burst therefore flushes as multiple
 * events, oldest leg first.
 *
 * `decoration` is resolved from the layer's own config array at push
 * time, not at flush time: `onMapped` carries only `id`, and a
 * dropped-then-forgotten id's entry is simply never visited at flush
 * (flush iterates the *current* config), so push-time resolution only
 * needs to outlive one microtask, not the id's whole lifetime.
 */
function createDecorationsBatcher(options: {
  getDecorations: () => Array<Decoration>
  onFlush: (events: Array<DecorationEvent>) => void
}) {
  const accumulator = new Map<string, DecorationsBatchEntry>()
  let scheduled = false
  let destroyed = false

  function entryFor(id: string): DecorationsBatchEntry {
    const resolved = options
      .getDecorations()
      .find((decoration) => decoration.id === id)
    let entry = accumulator.get(id)

    if (!entry) {
      entry = {
        decoration: resolved,
        closedLegs: [],
        openLeg: undefined,
      }
      accumulator.set(id, entry)
    } else if (resolved) {
      entry.decoration = resolved
    }

    return entry
  }

  function legFor(
    entry: DecorationsBatchEntry,
    origin: 'local' | 'remote',
  ): DecorationsBatchLeg {
    if (entry.openLeg && entry.openLeg.origin === origin) {
      return entry.openLeg
    }

    if (entry.openLeg) {
      entry.closedLegs.push(entry.openLeg)
    }

    entry.openLeg = {
      origin,
      latestRange: undefined,
      movedPreviousRange: undefined,
      movedOrigin: undefined,
      contentChangedOrigin: undefined,
      lost: undefined,
    }

    return entry.openLeg
  }

  function push(mappings: Array<DecorationMapping>) {
    for (const mapping of mappings) {
      const entry = entryFor(mapping.id)
      const leg = legFor(entry, mapping.origin)

      if (mapping.newRange === null) {
        leg.lost = {
          previousRange: leg.movedPreviousRange ?? mapping.previousRange,
          origin: mapping.origin,
        }
        continue
      }

      if (mapping.newRange !== mapping.previousRange) {
        leg.movedPreviousRange ??= mapping.previousRange
        leg.movedOrigin = mapping.origin
        leg.latestRange = mapping.newRange
      }

      if (mapping.contentTouched) {
        leg.contentChangedOrigin = mapping.origin
        leg.latestRange = mapping.newRange
      }
    }

    if (!scheduled) {
      scheduled = true
      queueMicrotask(flush)
    }
  }

  function flush() {
    scheduled = false

    if (destroyed) {
      accumulator.clear()
      return
    }

    const order = options.getDecorations()
    const events: Array<DecorationEvent> = []

    for (const decoration of order) {
      const entry = accumulator.get(decoration.id)

      if (!entry || !entry.decoration) {
        continue
      }

      const legs = entry.openLeg
        ? [...entry.closedLegs, entry.openLeg]
        : entry.closedLegs

      for (const leg of legs) {
        if (leg.lost) {
          events.push({
            type: 'lost',
            previousRange: leg.lost.previousRange,
            decoration: entry.decoration,
            origin: leg.lost.origin,
          })
          continue
        }

        if (
          leg.movedOrigin &&
          leg.movedPreviousRange &&
          leg.latestRange &&
          !isDeepEqual(leg.movedPreviousRange, leg.latestRange)
        ) {
          events.push({
            type: 'moved',
            previousRange: leg.movedPreviousRange,
            newRange: leg.latestRange,
            decoration: entry.decoration,
            origin: leg.movedOrigin,
          })
        }

        if (leg.contentChangedOrigin && leg.latestRange) {
          events.push({
            type: 'content-changed',
            range: leg.latestRange,
            decoration: entry.decoration,
            origin: leg.contentChangedOrigin,
          })
        }
      }
    }

    accumulator.clear()
    options.onFlush(events)
  }

  function dropPending(ids: Array<string>) {
    for (const id of ids) {
      accumulator.delete(id)
    }
  }

  function hasPendingLost(id: string): boolean {
    const entry = accumulator.get(id)

    if (!entry) {
      return false
    }

    return (
      entry.openLeg?.lost !== undefined ||
      entry.closedLegs.some((leg) => leg.lost !== undefined)
    )
  }

  function destroy() {
    destroyed = true
  }

  return {push, dropPending, hasPendingLost, destroy}
}
