import {Range} from '../slate'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {selection} = operation.editor

  if (!selection || !Range.isCollapsed(selection)) {
    return
  }

  const {path, offset} = selection.anchor

  if (operation.text.length > 0) {
    operation.editor.apply({
      type: 'insert_text',
      path,
      offset,
      text: operation.text,
    })
  }
}
