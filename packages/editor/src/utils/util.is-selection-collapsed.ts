import type {EditorSelection} from '../types/editor'
import {isEqualPaths} from './util.is-equal-paths'

/**
 * @public
 */
export function isSelectionCollapsed(selection: EditorSelection) {
  if (!selection) {
    return false
  }

  return (
    isEqualPaths(selection.anchor.path, selection.focus.path) &&
    selection.anchor.offset === selection.focus.offset
  )
}
