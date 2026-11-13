import type {Path} from '@portabletext/patches'

/** A selection point, structurally the editor's `EditorSelectionPoint`. */
export type TextSelectionPoint = {path: Path; offset: number}

/** A selection, structurally the editor's non-null `EditorSelection`. */
export type TextSelection = {
  anchor: TextSelectionPoint
  focus: TextSelectionPoint
  backward?: boolean
}

export function collapseSelection<
  TEditorSelection extends TextSelection | null,
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
