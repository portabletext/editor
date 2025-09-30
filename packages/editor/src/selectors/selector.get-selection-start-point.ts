import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../types/editor'

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
