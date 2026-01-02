import type {EditorSelection} from '../types/editor'

export function collapseSelection<
  TEditorSelection extends NonNullable<EditorSelection> | null,
>(selection: TEditorSelection, direction: 'start' | 'end'): TEditorSelection {
  if (!selection) {
    return selection
  }

  if (direction === 'start') {
    return (
      selection.backward
        ? {
            anchor: selection.focus,
            focus: selection.focus,
            backward: false,
          }
        : {
            anchor: selection.anchor,
            focus: selection.anchor,
            backward: false,
          }
    ) as TEditorSelection
  }

  return (
    selection.backward
      ? {
          anchor: selection.anchor,
          focus: selection.anchor,
          backward: false,
        }
      : {
          anchor: selection.focus,
          focus: selection.focus,
          backward: false,
        }
  ) as TEditorSelection
}
