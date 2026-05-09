import type {OperationImplementation} from './operation.types'

export const insertOperationImplementation: OperationImplementation<
  'insert'
> = ({operation}) => {
  operation.editor.apply({
    type: 'insert',
    path: operation.at,
    node: operation.value,
    position: operation.position,
  })
}
