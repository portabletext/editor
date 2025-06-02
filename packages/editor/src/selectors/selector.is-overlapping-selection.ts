import {
  getEditorSelection,
  selectionIncludesSelection,
} from '../editor/editor-selection'
import type {EditorSelection} from '../editor/editor-selection'
import type {EditorSelector} from './../editor/editor-selector'

/**
 * @public
 */
export function isOverlappingSelection(
  selection: EditorSelection,
): EditorSelector<boolean> {
  return (snapshot) => {
    const indexedSelection = getEditorSelection({
      type: 'indexed',
      schema: snapshot.context.schema,
      value: snapshot.context.value,
      selection: snapshot.context.selection,
    })

    const incomingIndexedSelection = getEditorSelection({
      type: 'indexed',
      schema: snapshot.context.schema,
      value: snapshot.context.value,
      selection,
    })

    if (!indexedSelection || !incomingIndexedSelection) {
      return false
    }

    return selectionIncludesSelection(
      indexedSelection,
      incomingIndexedSelection,
    )
  }
}
