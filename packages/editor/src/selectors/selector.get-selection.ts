import type {EditorSelection, EditorSelector} from './_exports'

/**
 * @public
 */
export const getSelection: EditorSelector<EditorSelection> = (snapshot) => {
  return snapshot.context.selection
}
