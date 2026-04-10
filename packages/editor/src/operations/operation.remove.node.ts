import type {OperationImplementation} from './operation.types'

export const removeNodeOperationImplementation: OperationImplementation<
  'remove'
> = ({operation}) => {
  const {editor, at, value, previousSiblingKey} = operation

  editor.apply({
    type: 'remove_node',
    path: at,
    node: value,
    previousSiblingKey,
  })
}
