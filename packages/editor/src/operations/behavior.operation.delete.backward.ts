import {deleteBackward} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteBackwardOperationImplementation: BehaviorOperationImplementation<
  'delete.backward'
> = ({operation}) => {
  deleteBackward(operation.editor, operation.unit)
}
