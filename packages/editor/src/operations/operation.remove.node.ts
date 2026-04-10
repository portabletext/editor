import type {OperationImplementation} from './operation.types'

export const removeNodeOperationImplementation: OperationImplementation<
  'remove.node'
> = ({operation}) => {
  const {editor, at, node} = operation

  editor.apply({
    type: 'remove_node',
    path: at,
    node,
  })
}
