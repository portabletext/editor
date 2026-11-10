import {
  useEditor,
  useEditorSelector,
  type EditorSelection,
} from '@portabletext/editor'
import {getSelection} from '@portabletext/editor/selectors'
import {isEqualSelections} from '@portabletext/editor/utils'

/**
 * The local user's selection, deduped by value.
 *
 * The editor produces a fresh selection object on every snapshot change, so
 * subscribing to it directly would report presence far more often than the
 * caret actually moves.
 *
 * @public
 */
export function useLocalSelection(): EditorSelection {
  const editor = useEditor()
  // Direction is ignored, which `isEqualSelections` already does: a caret is
  // drawn at the focus point, so reversing a selection moves nothing.
  return useEditorSelector(editor, getSelection, isEqualSelections)
}
