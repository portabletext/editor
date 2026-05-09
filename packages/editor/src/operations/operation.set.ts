import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  operation,
}) => {
  operation.editor.apply({
    type: 'set',
    path: operation.at,
    value: operation.value,
  })
}
