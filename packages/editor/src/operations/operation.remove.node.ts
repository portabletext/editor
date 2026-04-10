import type {OperationImplementation} from './operation.types'

export const removeNodeOperationImplementation: OperationImplementation<
  'remove.node'
> = ({operation}) => {
  const {editor, at, value} = operation

  editor.apply({
    type: 'remove_node',
    path: at,
    node: value,
  })
}
