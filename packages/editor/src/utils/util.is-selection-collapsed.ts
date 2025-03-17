import type {EditorSelection} from '../types/editor'

/**
 * @public
 */
export function isSelectionCollapsed(selection: EditorSelection) {
  if (!selection) {
    return false
  }

  return (
    selection.anchor.path.join() === selection.focus.path.join() &&
    selection.anchor.offset === selection.focus.offset
  )
}
