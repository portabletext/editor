import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelection} from '../types/editor'

/**
 * @public
 */
export const getSelection: EditorSelector<EditorSelection> = (snapshot) => {
  return snapshot.context.selection
}
