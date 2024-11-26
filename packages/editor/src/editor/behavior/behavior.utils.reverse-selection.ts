import type {EditorSelection} from '../../types/editor'

export function reverseSelection(selection: EditorSelection): EditorSelection {
  if (!selection) {
    return selection
  }

  if (selection.backward) {
    return {
      anchor: selection.focus,
      focus: selection.anchor,
      backward: false,
    }
  }

  return {
    anchor: selection.focus,
    focus: selection.anchor,
    backward: true,
  }
}
