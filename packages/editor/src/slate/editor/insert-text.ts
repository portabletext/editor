import type {EditorInterface} from '../interfaces/editor'
import {insertTextTransform} from '../transforms-text/insert-text'

export const insertText: EditorInterface['insertText'] = (
  editor,
  text,
  options = {},
) => {
  const {selection, marks} = editor

  if (selection) {
    if (marks) {
      const node = {text, ...marks}
      editor.insertNodes(node, {
        at: options.at,
        voids: options.voids,
      })
    } else {
      insertTextTransform(editor, text, options)
    }

    editor.marks = null
  }
}
