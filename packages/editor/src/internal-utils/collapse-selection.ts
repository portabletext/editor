import {
  isIndexedSelection,
  isIndexedSelectionBackward,
  type EditorSelection,
} from '../editor/editor-selection'

export function collapseSelection(
  selection: EditorSelection,
  direction: 'start' | 'end',
): EditorSelection {
  if (!selection) {
    return selection
  }

  if (isIndexedSelection(selection)) {
    if (direction === 'start') {
      return isIndexedSelectionBackward(selection)
        ? {
            anchor: selection.focus,
            focus: selection.focus,
          }
        : {
            anchor: selection.anchor,
            focus: selection.anchor,
          }
    }

    return isIndexedSelectionBackward(selection)
      ? {
          anchor: selection.anchor,
          focus: selection.anchor,
        }
      : {
          anchor: selection.focus,
          focus: selection.focus,
        }
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
