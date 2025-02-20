import type {EditorSelector} from '../editor/editor-selector'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export const isSelectionExpanded: EditorSelector<boolean> = (snapshot) => {
  return !isSelectionCollapsed(snapshot)
}
