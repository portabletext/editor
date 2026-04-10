import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  operation,
}) => {
  const {editor, at, properties, newProperties} = operation

  editor.apply({
    type: 'set_node',
    path: at,
    properties,
    newProperties,
  })
}
