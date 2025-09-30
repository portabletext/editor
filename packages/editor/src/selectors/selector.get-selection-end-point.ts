import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export const getSelectionEndPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  return snapshot.context.selection.backward
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus
}
