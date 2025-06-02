import type {
  EditorSelection,
  EditorSelectionPoint,
} from '../editor/editor-selection'
import {isBackward, isIndexedSelection} from '../editor/editor-selection'

/**
 * @public
 */
export function getSelectionEndPoint<
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
      selection.backward ? selection.anchor : selection.focus
    ) as TEditorSelectionPoint
  }

  return (
    isBackward(selection) ? selection.anchor : selection.focus
  ) as TEditorSelectionPoint
}
