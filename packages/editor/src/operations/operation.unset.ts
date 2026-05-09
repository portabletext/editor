import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  operation,
}) => {
  operation.editor.apply({
    type: 'unset',
    path: operation.at,
  })
}
