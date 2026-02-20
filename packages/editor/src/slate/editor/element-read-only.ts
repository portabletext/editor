import {Editor, type EditorInterface} from '../interfaces/editor'

export const elementReadOnly: EditorInterface['elementReadOnly'] = (
  editor,
  options = {},
) => {
  return Editor.above(editor, {
    ...options,
    match: (n) => editor.isElement(n) && Editor.isElementReadOnly(editor, n),
  })
}
