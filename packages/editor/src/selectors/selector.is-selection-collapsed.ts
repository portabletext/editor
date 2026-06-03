import type {EditorSelector} from '../editor/editor-selector'
import {isSelectionCollapsed as isSelectionCollapsedUtil} from '../utils/util.is-selection-collapsed'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = (snapshot) =>
  isSelectionCollapsedUtil(snapshot.context.selection)
