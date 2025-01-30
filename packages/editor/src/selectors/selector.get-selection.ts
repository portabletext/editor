import type {EditorSelection, EditorSelector} from './_exports'

/**
 * @public
 */
export const getSelection: EditorSelector<EditorSelection> = ({context}) => {
  return context.selection
}
