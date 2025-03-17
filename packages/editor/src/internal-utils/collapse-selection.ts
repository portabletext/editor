import type {EditorSelection} from '../types/editor'

export function collapseSelection(
  selection: EditorSelection,
  direction: 'start' | 'end',
): EditorSelection {
  if (!selection) {
    return selection
  }

  if (direction === 'start') {
    return selection.backward
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
  }

  return selection.backward
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
}
