import {Editor, type EditorInterface} from '../interfaces/editor'

export const hasInlines: EditorInterface['hasInlines'] = (editor, element) => {
  return (element.children ?? []).some(
    (n) => editor.isText(n) || Editor.isInline(editor, n),
  )
}
