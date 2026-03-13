import type {
  InsertNodeOperation,
  Operation,
  RemoveNodeOperation,
} from '../interfaces/operation'

export function operationCanTransformPath(
  operation: Operation,
): operation is InsertNodeOperation | RemoveNodeOperation {
  switch (operation.type) {
    case 'insert_node':
    case 'remove_node':
      return true
    default:
      return false
  }
}
