import {Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({operation}) => {
  Transforms.insertText(operation.editor, operation.text)
}
