import {Editor, type EditorInterface} from '../interfaces/editor'

export const hasBlocks: EditorInterface['hasBlocks'] = (editor, element) => {
  return element.children.some(
    (n) => editor.isElement(n) && Editor.isBlock(editor, n),
  )
}
