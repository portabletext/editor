import {isBackward, isIndexedSelection} from '../editor/indexed-selection'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function getSelectionStartPoint<
  TEditorSelection extends NonNullable<EditorSelection> | null,
  TEditorSelectionPoint extends
    EditorSelectionPoint | null = TEditorSelection extends NonNullable<EditorSelection>
    ? EditorSelectionPoint
    : null,
>(selection: TEditorSelection): TEditorSelectionPoint {
  if (!selection) {
    return null as TEditorSelectionPoint
  }

  if (!isIndexedSelection(selection)) {
    return (
      selection.backward ? selection.focus : selection.anchor
    ) as TEditorSelectionPoint
  }

  return (
    isBackward(selection) ? selection.focus : selection.anchor
  ) as TEditorSelectionPoint
}
