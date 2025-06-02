import type {EditorSelection} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getSelection: EditorSelector<EditorSelection> = (snapshot) => {
  return snapshot.context.selection
}
