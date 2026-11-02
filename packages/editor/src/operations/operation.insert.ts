import {resolveOperationPath} from '../internal-utils/resolve-operation-path'
import type {OperationImplementation} from './operation.types'

export const insertOperationImplementation: OperationImplementation<
  'insert'
> = ({operation}) => {
  const path = resolveOperationPath(
    operation.editor.snapshot.context.value,
    operation.at,
    {insert: true},
  )

  if (!path) {
    return
  }

  operation.editor.apply({
    type: 'insert',
    path,
    node: operation.value,
    position: operation.position,
  })
}
