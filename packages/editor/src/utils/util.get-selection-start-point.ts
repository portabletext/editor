import type {EditorSelection, EditorSelectionPoint} from '..'

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

  return (
    selection.backward ? selection.focus : selection.anchor
  ) as TEditorSelectionPoint
}
