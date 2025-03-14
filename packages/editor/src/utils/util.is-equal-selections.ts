import type {EditorSelection} from '../types/editor'
import {isEqualSelectionPoints} from './util.is-equal-selection-points'

/**
 * @public
 */
export function isEqualSelections(a: EditorSelection, b: EditorSelection) {
  if (!a && !b) {
    return true
  }

  if (!a || !b) {
    return false
  }

  return (
    isEqualSelectionPoints(a.anchor, b.anchor) &&
    isEqualSelectionPoints(a.focus, b.focus)
  )
}
