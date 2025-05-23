import type {EditorSelector} from '../editor/editor-selector'
import {EditorSelectionPoint, isBackward} from '../types/selection'

/**
 * @public
 */
export const getSelectionEndPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  return isBackward(snapshot.context.selection)
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus
}
