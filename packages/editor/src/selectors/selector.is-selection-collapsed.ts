import type {EditorSelector} from '../editor/editor-selector'
import {isEqualPaths} from '../utils/util.is-equal-paths'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  return (
    isEqualPaths(
      snapshot.context.selection.anchor.path,
      snapshot.context.selection.focus.path,
    ) &&
    snapshot.context.selection.anchor.offset ===
      snapshot.context.selection.focus.offset
  )
}
