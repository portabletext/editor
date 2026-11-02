import {resolveOperationPath} from '../internal-utils/resolve-operation-path'
import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  operation,
}) => {
  const path = resolveOperationPath(
    operation.editor.snapshot.context.value,
    operation.at,
  )

  if (!path) {
    return
  }

  operation.editor.apply({type: 'unset', path})
}
