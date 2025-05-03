import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteForwardOperationImplementation: BehaviorOperationImplementation<
  'delete.forward'
> = ({operation}) => {
  operation.editor.deleteForward(operation.unit)
}
