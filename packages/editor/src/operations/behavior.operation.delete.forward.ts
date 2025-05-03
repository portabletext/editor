import {deleteForward} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteForwardOperationImplementation: BehaviorOperationImplementation<
  'delete.forward'
> = ({operation}) => {
  deleteForward(operation.editor, operation.unit)
}
