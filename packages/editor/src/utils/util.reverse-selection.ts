import type {EditorSelection} from '../types/editor'

/**
 * @public
 */
export function reverseSelection(
  selection: NonNullable<EditorSelection>,
): NonNullable<EditorSelection> {
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
