import {
  getEditorSelection,
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

  const indexedSelection = getEditorSelection({
    type: 'indexed',
    schema: snapshot.context.schema,
    value: snapshot.context.value,
    selection: snapshot.context.selection,
  })

  if (!indexedSelection) {
    return false
  }

  return isIndexedSelectionCollapsed(indexedSelection)
}
