import {
  getIndexedSelection,
  isIndexedSelectionBackward,
  type EditorSelectionPoint,
} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getSelectionStartPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return undefined
  }

  return isIndexedSelectionBackward(indexedSelection)
    ? indexedSelection.focus
    : indexedSelection.anchor
}
