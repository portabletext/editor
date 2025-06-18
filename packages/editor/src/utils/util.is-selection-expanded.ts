import type {EditorSelection} from '../types/editor'
import {isSelectionCollapsed} from './util.is-selection-collapsed'

/**
 * @public
 */
export function isSelectionExpanded(selection: EditorSelection) {
  if (!selection) {
    return false
  }

  return !isSelectionCollapsed(selection)
}
