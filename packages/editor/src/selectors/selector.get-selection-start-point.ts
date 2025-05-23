import type {EditorSelector} from '../editor/editor-selector'
import {EditorSelectionPoint, isBackward} from '../types/selection'

/**
 * @public
 */
export const getSelectionStartPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  return isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor
}
