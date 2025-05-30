import type {EditorSelectionPoint} from '..'
import type {EditorSelector} from '../editor/editor-selector'
import {getIndexedSelection, isBackward} from '../editor/indexed-selection'

/**
 * @public
 */
export const getSelectionEndPoint: EditorSelector<
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

  return isBackward(indexedSelection)
    ? indexedSelection.anchor
    : indexedSelection.focus
}
