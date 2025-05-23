import {EditorSelection, isBackward} from '../types/selection'

/**
 * @public
 */
export function reverseSelection<
  TEditorSelection extends NonNullable<EditorSelection> | null,
>(selection: TEditorSelection): TEditorSelection {
  if (!selection) {
    return selection
  }

  return {
    anchor: selection.focus,
    focus: selection.anchor,
  } as TEditorSelection
}
