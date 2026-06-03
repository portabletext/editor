import {isBackwardRange} from '../engine/range/is-backward-range'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Returns the selection's edges in document order: `[start, end]`.
 *
 * Direction-independent — a backward selection's `focus` comes back as
 * `start`. Useful when an operation needs to act from the document-order
 * start to end regardless of which direction the user selected.
 *
 * @beta
 */
export function getRangeEdges(
  snapshot: TraversalSnapshot,
  range: NonNullable<EditorSelection>,
): [EditorSelectionPoint, EditorSelectionPoint] {
  const {anchor, focus} = range
  return isBackwardRange(range, {value: snapshot.context.value})
    ? [focus, anchor]
    : [anchor, focus]
}
