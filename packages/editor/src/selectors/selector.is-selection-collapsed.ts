import type {EditorSelector} from '../editor/editor-selector'
import {isCollapsed} from '../types/selection'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  return isCollapsed(snapshot.context.selection)
}
