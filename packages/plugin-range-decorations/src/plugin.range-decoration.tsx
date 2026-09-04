import type {RegistrableRangeDecoration} from '@portabletext/editor'
import type {RangeDecorationEvent} from './range-decoration.types'
import {useRangeDecorationLayer} from './use-range-decoration-layer'

/**
 * @beta
 * The hook in component form, for consumers that need no reads. See
 * `useRangeDecorationLayer` for the full registration, reconciliation,
 * and `on`-timing contract.
 */
export function RangeDecorationPlugin(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  on?: (events: Array<RangeDecorationEvent>) => void
}) {
  useRangeDecorationLayer(props)
  return null
}
