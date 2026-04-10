import type {OperationImplementation} from './operation.types'

export const insertNodeOperationImplementation: OperationImplementation<
  'insert'
> = ({operation}) => {
  const {editor, at, value, position} = operation

  editor.apply({
    type: 'insert_node',
    path: at,
    node: value,
    position,
  })
}
