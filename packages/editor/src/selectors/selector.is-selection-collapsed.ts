import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = ({context}) => {
  if (!context.selection) {
    return false
  }

  return (
    JSON.stringify(context.selection.anchor.path) ===
      JSON.stringify(context.selection.focus.path) &&
    context.selection?.anchor.offset === context.selection?.focus.offset
  )
}
