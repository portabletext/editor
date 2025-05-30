import type {EditorSelector} from '../editor/editor-selector'
import {getIndexedSelection, isCollapsed} from '../editor/indexed-selection'

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

  return isCollapsed(indexedSelection)
}
