import {resolveOperationPath} from '../internal-utils/resolve-operation-path'
import type {OperationImplementation} from './operation.types'

export const removeTextOperationImplementation: OperationImplementation<
  'remove.text'
> = ({operation}) => {
  if (operation.text.length === 0) {
    return
  }

  const path = resolveOperationPath(
    operation.editor.snapshot.context.value,
    operation.at,
  )

  if (!path) {
    return
  }

  operation.editor.apply({
    type: 'remove.text',
    path,
    offset: operation.offset,
    text: operation.text,
  })
}
