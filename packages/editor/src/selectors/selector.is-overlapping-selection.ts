import {
  getIndexedSelection,
  selectionIncludesSelection,
} from '../editor/indexed-selection'
import type {EditorSelection} from '../types/editor'
import type {EditorSelector} from './../editor/editor-selector'

/**
 * @public
 */
export function isOverlappingSelection(
  selection: EditorSelection,
): EditorSelector<boolean> {
  return (snapshot) => {
    const indexedSelection = getIndexedSelection(
      snapshot.context.schema,
      snapshot.context.value,
      snapshot.context.selection,
    )

    const incomingIndexedSelection = getIndexedSelection(
      snapshot.context.schema,
      snapshot.context.value,
      selection,
    )

    if (!indexedSelection || !incomingIndexedSelection) {
      return false
    }

    return selectionIncludesSelection(
      indexedSelection,
      incomingIndexedSelection,
    )
  }
}
