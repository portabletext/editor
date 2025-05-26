import type {EditorSelection} from '../types/editor'

/**
 * @public
 */
export function isSelectionCollapsed(selection: EditorSelection) {
  if (!selection) {
    return false
  }

  return (
    JSON.stringify(selection.anchor.path) ===
      JSON.stringify(selection.focus.path) &&
    selection.anchor.offset === selection.focus.offset
  )
}
