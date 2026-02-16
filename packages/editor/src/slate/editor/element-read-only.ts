import {Editor, type EditorInterface} from '../interfaces/editor'
import {Element} from '../interfaces/element'

export const elementReadOnly: EditorInterface['elementReadOnly'] = (
  editor,
  options = {},
) => {
  return Editor.above(editor, {
    ...options,
    match: (n) => Element.isElement(n) && Editor.isElementReadOnly(editor, n),
  })
}
