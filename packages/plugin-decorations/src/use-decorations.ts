import {useSyncExternalStore} from 'react'
import {getDecorationsLayerInternals} from './create-decoration-layer'
import type {DecorationLayer} from './decoration.types'

function subscribeToNothing() {
  return () => {}
}

/**
 * @beta
 * Subscribes to a `DecorationLayer`'s `current`, re-rendering the caller
 * at the same cadence `layer.current` itself updates: the settled
 * boundary after an edit, and after `update()`.
 */
export function useDecorations(
  layer: DecorationLayer,
): DecorationLayer['current'] {
  const internals = getDecorationsLayerInternals(layer)
  const getSnapshot = () => layer.current

  return useSyncExternalStore(
    internals?.subscribe ?? subscribeToNothing,
    getSnapshot,
    getSnapshot,
  )
}
