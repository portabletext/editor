import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../utils'

/**
 * @public
 */
export const getSelectionStartPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

  return context.selection.backward
    ? context.selection.focus
    : context.selection.anchor
}
