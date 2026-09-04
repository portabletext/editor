import {useSyncExternalStore} from 'react'
import {getRangeDecorationsLayerInternals} from './create-range-decoration-layer'
import type {RangeDecorationLayer} from './range-decoration.types'

function subscribeToNothing() {
  return () => {}
}

/**
 * @beta
 * Subscribes to a `RangeDecorationLayer`'s `current`, re-rendering the
 * caller at the same cadence `layer.current` itself updates: the settled
 * boundary after an edit, and after `update()`.
 */
export function useRangeDecorations(
  layer: RangeDecorationLayer,
): RangeDecorationLayer['current'] {
  const internals = getRangeDecorationsLayerInternals(layer)

  return useSyncExternalStore(
    internals?.subscribe ?? subscribeToNothing,
    () => layer.current,
  )
}
