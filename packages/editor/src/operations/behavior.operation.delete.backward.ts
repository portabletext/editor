import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteBackwardOperationImplementation: BehaviorOperationImplementation<
  'delete.backward'
> = ({operation}) => {
  operation.editor.deleteBackward(operation.unit)
}
