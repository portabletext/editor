import {isIndexedSelection} from '../editor/indexed-selection'
import type {EditorSelection} from '../types/editor'

/**
 * @public
 */
export function reverseSelection<
  TEditorSelection extends NonNullable<EditorSelection> | null,
>(selection: TEditorSelection): TEditorSelection {
  if (!selection) {
    return selection
  }

  if (isIndexedSelection(selection)) {
    return {
      anchor: selection.focus,
      focus: selection.anchor,
    } as TEditorSelection
  }

  if (selection.backward) {
    return {
      anchor: selection.focus,
      focus: selection.anchor,
      backward: false,
    } as TEditorSelection
  }

  return {
    anchor: selection.focus,
    focus: selection.anchor,
    backward: true,
  } as TEditorSelection
}
