import {Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({operation}) => {
  if (operation.editor.marks) {
    Transforms.insertNodes(operation.editor, {
      text: operation.text,
      ...operation.editor.marks,
    })
  } else {
    Transforms.insertText(operation.editor, operation.text)
  }

  operation.editor.marks = null
}
