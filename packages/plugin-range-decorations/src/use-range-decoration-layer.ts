import type {RegistrableRangeDecoration} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {assertUniqueRangeDecorationIds} from './assert-unique-range-decoration-ids'
import {
  createRangeDecorationLayer,
  getRangeDecorationsLayerInternals,
  setRangeDecorationsLayerInternals,
} from './create-range-decoration-layer'
import type {
  RangeDecorationEvent,
  RangeDecorationLayer,
} from './range-decoration.types'

/**
 * @beta
 *
 * The React binding for a layer of range decorations, independent of
 * any `PortableTextEditable`'s `rangeDecorations` prop. Returns a
 * stable handle for the component's lifetime, never `null`.
 * Registration happens in an effect behind the handle: before it
 * lands, `current` is an empty array. The hook owns the layer's
 * contents, supplying them from `rangeDecorations` on every sync: a
 * direct `update()` call on the handle is superseded by that sync, and
 * the method stays on this handle only for parity with a layer
 * `createRangeDecorationLayer` creates directly. Reconciles a changed
 * `rangeDecorations` array in place (see `createRangeDecorationLayer`
 * for the full `id`-based reconciliation contract; no memoization is
 * required for correctness), unregisters on unmount, and re-registers
 * behind the same handle when the `editor` instance changes.
 *
 * `on` may be inline; handler identity never matters. Duplicate `id`s
 * throw synchronously: from the effect that applies a changed
 * `rangeDecorations` prop, or, for a direct call on the returned
 * handle, from that call itself.
 *
 * Chain `useRangeDecorations(handle)` off the returned handle for
 * reactive reads; it never needs a null guard.
 *
 * Like `BehaviorPlugin`, stabilize `rangeDecorations` (a module-level
 * constant or `useMemo`) when the owner re-renders frequently and
 * decorations are many: a new array reference per render still sends
 * an `update` through reconciliation, though the layer's stacking
 * position never moves. Give each decoration a stable `id` and
 * `render` reference: a new `render` reference is indistinguishable
 * from an intentional change and re-renders the decoration on every
 * owner render.
 */
export function useRangeDecorationLayer(options: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  on?: (events: Array<RangeDecorationEvent>) => void
}): RangeDecorationLayer {
  const editor = useEditor()
  const [{facade, attach, detach}] = useState(createRangeDecorationLayerFacade)
  const lastPushedRangeDecorations =
    useRef<Array<RegistrableRangeDecoration> | null>(null)

  const handleEvents = useEffectEvent((events: Array<RangeDecorationEvent>) => {
    options.on?.(events)
  })
  const pushRangeDecorations = useEffectEvent(() => {
    facade.update(options.rangeDecorations)
    lastPushedRangeDecorations.current = options.rangeDecorations
  })

  useEffect(() => {
    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [],
      on: handleEvents,
    })
    attach(layer)
    pushRangeDecorations()

    return () => {
      layer.unregister()
      detach()
    }
    // `attach`/`detach` never change: both close over the one facade the
    // `useState` initializer above creates. `editor` is what should
    // actually re-run this effect.
  }, [editor, attach, detach])

  useEffect(() => {
    if (lastPushedRangeDecorations.current === options.rangeDecorations) {
      return
    }
    pushRangeDecorations()
  }, [options.rangeDecorations])

  return facade
}

const EMPTY_CURRENT: RangeDecorationLayer['current'] = []

type RangeDecorationLayerFacadeHandle = {
  facade: RangeDecorationLayer
  attach: (layer: RangeDecorationLayer) => void
  detach: () => void
}

/**
 * The `RangeDecorationLayer` `useRangeDecorationLayer` hands back:
 * forwards `update`/`unregister`/`current` to whichever real layer is
 * currently attached; otherwise (before the first attach, and between
 * an unmount/`editor`-change detach and its following re-attach)
 * `update()` only validates and `current` reads empty.
 */
function createRangeDecorationLayerFacade(): RangeDecorationLayerFacadeHandle {
  let real: RangeDecorationLayer | null = null
  let dead = false
  let unsubscribeFromReal: (() => void) | null = null
  const subscribers = new Set<() => void>()

  function notifySubscribers() {
    for (const subscriber of subscribers) {
      subscriber()
    }
  }

  const facade: RangeDecorationLayer = {
    /**
     * The hook owns this layer's contents: pushed from
     * `rangeDecorations` right after attach, so a call landing before
     * that only validates and is dropped, superseded immediately by
     * that push.
     */
    update: (rangeDecorations) => {
      if (dead) {
        return
      }

      if (real) {
        real.update(rangeDecorations)
        return
      }

      assertUniqueRangeDecorationIds(rangeDecorations)
    },
    unregister: () => {
      if (dead) {
        return
      }

      dead = true
      real?.unregister()
      unsubscribeFromReal?.()
      unsubscribeFromReal = null
      real = null
    },
    get current() {
      return real ? real.current : EMPTY_CURRENT
    },
  }

  // Runs during this `useState` initializer's render, not an effect: a
  // consumer calling `useRangeDecorations` on this handle in that same
  // initial render (an owner that mounts before the editor is ready)
  // needs this already resolvable. Safe despite running during render:
  // the `WeakMap` key is this call's own fresh `facade`, so a discarded
  // StrictMode double-render's entry is unreachable along with it.
  setRangeDecorationsLayerInternals(facade, {
    subscribe: (callback) => {
      subscribers.add(callback)
      return () => {
        subscribers.delete(callback)
      }
    },
  })

  return {
    facade,
    attach: (layer) => {
      if (dead) {
        // `unregister()` landed before this registration effect ran.
        layer.unregister()
        return
      }

      real = layer
      unsubscribeFromReal =
        getRangeDecorationsLayerInternals(real)?.subscribe(notifySubscribers) ??
        null
    },
    detach: () => {
      unsubscribeFromReal?.()
      unsubscribeFromReal = null
      real = null
    },
  }
}
