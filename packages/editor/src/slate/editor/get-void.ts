import {Editor, type EditorInterface} from '../interfaces/editor'

export const getVoid: EditorInterface['void'] = (editor, options = {}) => {
  return Editor.above(editor, {
    ...options,
    match: (n) => editor.isElement(n) && Editor.isVoid(editor, n),
  })
}
