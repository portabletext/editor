import type {Decoration} from '@portabletext/editor'
import {useEditor} from '@portabletext/editor'
import {useEffect, useEffectEvent, useRef, useState} from 'react'
import {assertUniqueDecorationIds} from './assert-unique-decoration-ids'
import {
  createDecorationLayer,
  getDecorationsLayerInternals,
  setDecorationsLayerInternals,
} from './create-decoration-layer'
import type {DecorationEvent, DecorationLayer} from './decoration.types'

/**
 * @beta
 *
 * The React binding for a layer of decorations. Returns a stable
 * handle for the component's lifetime, never `null`. Registration
 * happens in an effect behind the handle: before it lands, `current` is
 * an empty array. The hook owns the layer's contents, supplying them
 * from `decorations` on every render, so there is no need to call the
 * handle's `update()` yourself: the next render overwrites whatever a
 * direct call set. Reconciles a changed `decorations` array in place (see
 * `createDecorationLayer` for the full `id`-based reconciliation
 * contract; no memoization is required for correctness), unregisters on
 * unmount, and re-registers behind the same handle when the `editor`
 * instance changes.
 *
 * `on` may be inline; handler identity never matters. Duplicate `id`s
 * throw synchronously: from the effect that applies a changed
 * `decorations` prop, or, for a direct call on the returned handle,
 * from that call itself.
 *
 * Chain `useDecorations(handle)` off the returned handle for reactive
 * reads; it never needs a null guard.
 *
 * Like `BehaviorPlugin`, stabilize `decorations` (a module-level
 * constant or `useMemo`) when the owner re-renders frequently and
 * decorations are many: a new array reference per render still sends an
 * `update` through reconciliation, though the layer's stacking position
 * never moves. Give each decoration a stable `id` and `render`
 * reference: a new `render` reference is indistinguishable from an
 * intentional change and re-renders the decoration on every owner
 * render.
 */
export function useDecorationLayer(options: {
  decorations: Array<Decoration>
  on?: (events: Array<DecorationEvent>) => void
}): DecorationLayer {
  const editor = useEditor()
  const [{facade, attach, detach}] = useState(createDecorationLayerFacade)
  const lastPushedDecorations = useRef<Array<Decoration> | null>(null)

  const handleEvents = useEffectEvent((events: Array<DecorationEvent>) => {
    options.on?.(events)
  })
  const pushDecorations = useEffectEvent(() => {
    facade.update(options.decorations)
    lastPushedDecorations.current = options.decorations
  })

  useEffect(() => {
    const layer = createDecorationLayer(editor, {
      decorations: [],
      on: handleEvents,
    })
    attach(layer)
    pushDecorations()

    return () => {
      layer.unregister()
      detach()
    }
    // `attach`/`detach` never change: both close over the one facade the
    // `useState` initializer above creates. `editor` is what should
    // actually re-run this effect.
  }, [editor, attach, detach])

  useEffect(() => {
    if (lastPushedDecorations.current === options.decorations) {
      return
    }
    pushDecorations()
  }, [options.decorations])

  return facade
}

const EMPTY_CURRENT: DecorationLayer['current'] = []

type DecorationLayerFacadeHandle = {
  facade: DecorationLayer
  attach: (layer: DecorationLayer) => void
  detach: () => void
}

/**
 * The `DecorationLayer` `useDecorationLayer` hands back: forwards
 * `update`/`unregister`/`current` to whichever real layer is currently
 * attached; otherwise (before the first attach, and between an
 * unmount/`editor`-change detach and its following re-attach)
 * `update()` only validates and `current` reads empty.
 */
function createDecorationLayerFacade(): DecorationLayerFacadeHandle {
  let real: DecorationLayer | null = null
  let dead = false
  let unsubscribeFromReal: (() => void) | null = null
  const subscribers = new Set<() => void>()

  function notifySubscribers() {
    for (const subscriber of subscribers) {
      subscriber()
    }
  }

  const facade: DecorationLayer = {
    /**
     * The hook owns this layer's contents: pushed from `decorations`
     * right after attach, so a call landing before that only validates
     * and is dropped, superseded immediately by that push.
     */
    update: (decorations) => {
      if (dead) {
        return
      }

      if (real) {
        real.update(decorations)
        return
      }

      assertUniqueDecorationIds(decorations)
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
  // consumer calling `useDecorations` on this handle in that same
  // initial render (an owner that mounts before the editor is ready)
  // needs this already resolvable. Safe despite running during render:
  // the `WeakMap` key is this call's own fresh `facade`, so a discarded
  // StrictMode double-render's entry is unreachable along with it.
  setDecorationsLayerInternals(facade, {
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
        getDecorationsLayerInternals(real)?.subscribe(notifySubscribers) ?? null
    },
    detach: () => {
      unsubscribeFromReal?.()
      unsubscribeFromReal = null
      real = null
    },
  }
}
