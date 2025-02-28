import type {EditorSelection} from '..'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getSelection: EditorSelector<EditorSelection> = (snapshot) => {
  return snapshot.context.selection
}
