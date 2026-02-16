import {Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  Transforms.insertText(operation.editor, operation.text)
}
