import {Editor, Range} from '../slate'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation
  const {selection} = editor

  if (!selection || !Range.isCollapsed(selection)) {
    return
  }

  if (
    Editor.void(editor, {at: selection}) ||
    Editor.elementReadOnly(editor, {at: selection})
  ) {
    return
  }

  const {path, offset} = selection.anchor

  if (operation.text.length > 0) {
    editor.apply({
      type: 'insert_text',
      path,
      offset,
      text: operation.text,
    })
  }
}
