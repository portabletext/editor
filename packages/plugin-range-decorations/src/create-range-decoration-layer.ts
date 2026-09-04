import type {
  Editor,
  EditorSelection,
  RangeDecorationMapping,
  RegistrableRangeDecoration,
} from '@portabletext/editor'
import {assertUniqueRangeDecorationIds} from './assert-unique-range-decoration-ids'
import {isDeepEqual} from './equality'
import type {
  RangeDecorationEvent,
  RangeDecorationLayer,
} from './range-decoration.types'

export type RangeDecorationsLayerInternals = {
  subscribe: (callback: () => void) => () => void
}

/**
 * `useRangeDecorations` needs a way to subscribe to a layer's `current`
 * without that subscribe function joining the public, proposal-shaped
 * `RangeDecorationLayer` type. Keyed by the layer handle's own identity.
 */
const layerInternals = new WeakMap<
  RangeDecorationLayer,
  RangeDecorationsLayerInternals
>()

export function getRangeDecorationsLayerInternals(
  layer: RangeDecorationLayer,
): RangeDecorationsLayerInternals | undefined {
  return layerInternals.get(layer)
}

/**
 * `useRangeDecorationLayer`'s facade handle registers itself here too, so
 * `useRangeDecorations` resolves it exactly like a real layer.
 */
export function setRangeDecorationsLayerInternals(
  layer: RangeDecorationLayer,
  internals: RangeDecorationsLayerInternals,
): void {
  layerInternals.set(layer, internals)
}

/**
 * @beta
 *
 * The imperative vocabulary factory: wraps `editor.registerRangeDecorations`
 * (the framework-neutral primitive) with the batched `on` events and the
 * `current` live-position snapshot. `unregister` tears the underlying
 * registration down; `useRangeDecorationLayer` is the React binding built
 * on top.
 */
export function createRangeDecorationLayer(
  editor: Editor,
  options: {
    rangeDecorations: Array<RegistrableRangeDecoration>
    on?: (events: Array<RangeDecorationEvent>) => void
  },
): RangeDecorationLayer {
  let unregistered = false
  let currentRangeDecorations = options.rangeDecorations
  let currentCache: RangeDecorationLayer['current'] = []
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

  const batcher = createRangeDecorationsBatcher({
    getRangeDecorations: () => currentRangeDecorations,
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

  const registration = editor.registerRangeDecorations({
    rangeDecorations: options.rangeDecorations,
    onMapped: batcher.push,
  })
  recomputeCurrent()

  // No per-op nudge from core primes a layer registered before `ready`
  // (see `RangeDecorationRegistration.getDecorations`'s own contract):
  // re-read once the editor settles so `current` (and any
  // `useRangeDecorations` subscriber) catches up without waiting for
  // either an edit or an `update()`.
  const readySubscription = editor.on('ready', () => recomputeCurrent())

  const layer: RangeDecorationLayer = {
    update: (rangeDecorations) => {
      if (unregistered) {
        return
      }

      assertUniqueRangeDecorationIds(rangeDecorations)

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
        rangeDecorations.map((rangeDecoration) => [
          rangeDecoration.id,
          rangeDecoration,
        ]),
      )
      const idsToDropNow: Array<string> = []
      const repointedIdsWithPendingLost: Array<string> = []

      for (const previous of currentRangeDecorations) {
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

      currentRangeDecorations = rangeDecorations
      registration.update(rangeDecorations)

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

type RangeDecorationsBatchEntry = {
  rangeDecoration: RegistrableRangeDecoration | undefined
  latestRange: NonNullable<EditorSelection> | undefined
  movedPreviousRange: NonNullable<EditorSelection> | undefined
  movedOrigin: 'local' | 'remote' | undefined
  contentChangedOrigin: 'local' | 'remote' | undefined
  lost:
    | {previousRange: NonNullable<EditorSelection>; origin: 'local' | 'remote'}
    | undefined
}

/**
 * Coalesces core's raw, per-operation `onMapped` mappings into one call
 * per settled burst (the trailing-microtask pattern also used by the
 * relay's `{batch: true}` listeners, see `editor`'s `relay.ts`). A
 * mapping folds into this layer's vocabulary by shape alone, since core
 * carries no event-type discriminant: `newRange === null` is `lost`;
 * `newRange !== previousRange` (by reference) is a `moved` leg;
 * `contentTouched` is a `content-changed` leg. Multiple raw mappings for
 * the same decoration within one burst fold into at most one `moved`,
 * one `content-changed`, and never both alongside a `lost`.
 *
 * `rangeDecoration` is resolved from the layer's own config array at
 * push time, not at flush time: `onMapped` carries only `id`, and a
 * dropped-then-forgotten id's entry is simply never visited at flush
 * (flush iterates the *current* config), so push-time resolution only
 * needs to outlive one microtask, not the id's whole lifetime.
 */
function createRangeDecorationsBatcher(options: {
  getRangeDecorations: () => Array<RegistrableRangeDecoration>
  onFlush: (events: Array<RangeDecorationEvent>) => void
}) {
  const accumulator = new Map<string, RangeDecorationsBatchEntry>()
  let scheduled = false
  let destroyed = false

  function entryFor(id: string): RangeDecorationsBatchEntry {
    const resolved = options
      .getRangeDecorations()
      .find((rangeDecoration) => rangeDecoration.id === id)
    let entry = accumulator.get(id)

    if (!entry) {
      entry = {
        rangeDecoration: resolved,
        latestRange: undefined,
        movedPreviousRange: undefined,
        movedOrigin: undefined,
        contentChangedOrigin: undefined,
        lost: undefined,
      }
      accumulator.set(id, entry)
    } else if (resolved) {
      entry.rangeDecoration = resolved
    }

    return entry
  }

  function push(mappings: Array<RangeDecorationMapping>) {
    for (const mapping of mappings) {
      const entry = entryFor(mapping.id)

      if (mapping.newRange === null) {
        entry.lost = {
          previousRange: entry.movedPreviousRange ?? mapping.previousRange,
          origin: mapping.origin,
        }
        continue
      }

      if (mapping.newRange !== mapping.previousRange) {
        entry.movedPreviousRange ??= mapping.previousRange
        entry.movedOrigin = mapping.origin
        entry.latestRange = mapping.newRange
      }

      if (mapping.contentTouched) {
        entry.contentChangedOrigin = mapping.origin
        entry.latestRange = mapping.newRange
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

    const order = options.getRangeDecorations()
    const events: Array<RangeDecorationEvent> = []

    for (const rangeDecoration of order) {
      const entry = accumulator.get(rangeDecoration.id)

      if (!entry || !entry.rangeDecoration) {
        continue
      }

      if (entry.lost) {
        events.push({
          type: 'lost',
          previousRange: entry.lost.previousRange,
          rangeDecoration: entry.rangeDecoration,
          origin: entry.lost.origin,
        })
        continue
      }

      if (
        entry.movedOrigin &&
        entry.movedPreviousRange &&
        entry.latestRange &&
        !isDeepEqual(entry.movedPreviousRange, entry.latestRange)
      ) {
        events.push({
          type: 'moved',
          previousRange: entry.movedPreviousRange,
          newRange: entry.latestRange,
          rangeDecoration: entry.rangeDecoration,
          origin: entry.movedOrigin,
        })
      }

      if (entry.contentChangedOrigin && entry.latestRange) {
        events.push({
          type: 'content-changed',
          range: entry.latestRange,
          rangeDecoration: entry.rangeDecoration,
          origin: entry.contentChangedOrigin,
        })
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
    return accumulator.get(id)?.lost !== undefined
  }

  function destroy() {
    destroyed = true
  }

  return {push, dropPending, hasPendingLost, destroy}
}
