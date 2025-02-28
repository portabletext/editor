import type {EditorSelectionPoint} from '..'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getSelectionStartPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  return snapshot.context.selection.backward
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor
}
