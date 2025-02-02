import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../utils'

/**
 * @public
 */
export const getSelectionEndPoint: EditorSelector<
  EditorSelectionPoint | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

  return context.selection.backward
    ? context.selection.anchor
    : context.selection.focus
}
