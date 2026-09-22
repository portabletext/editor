import type {Decoration} from '@portabletext/editor'
import type {DecorationEvent} from './decoration.types'
import {useDecorationLayer} from './use-decoration-layer'

/**
 * @beta
 * The hook in component form, for consumers that need no reads. See
 * `useDecorationLayer` for the full registration, reconciliation, and
 * `on`-timing contract.
 */
export function DecorationsPlugin(props: {
  decorations: Array<Decoration>
  on?: (events: Array<DecorationEvent>) => void
}) {
  useDecorationLayer(props)
  return null
}
