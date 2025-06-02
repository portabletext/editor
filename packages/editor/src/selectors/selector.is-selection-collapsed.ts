import {
  getIndexedSelection,
  isIndexedSelectionCollapsed,
} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const isSelectionCollapsed: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return false
  }

  return isIndexedSelectionCollapsed(indexedSelection)
}
