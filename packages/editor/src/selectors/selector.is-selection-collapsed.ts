import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  return (
    JSON.stringify(snapshot.context.selection.anchor.path) ===
      JSON.stringify(snapshot.context.selection.focus.path) &&
    snapshot.context.selection?.anchor.offset ===
      snapshot.context.selection?.focus.offset
  )
}
