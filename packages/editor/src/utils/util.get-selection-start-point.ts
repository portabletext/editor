import {
  isBackward,
  isIndexedSelection,
  type EditorSelection,
  type EditorSelectionPoint,
} from '../editor/editor-selection'

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
