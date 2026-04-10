import {parentPath} from '../slate/path/parent-path'
import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  operation,
}) => {
  const {editor, at, previousValue} = operation

  const name = at.at(-1)

  if (typeof name !== 'string') {
    console.error(`unset: last path segment must be a property name`)
    return
  }

  const nodePath = parentPath(at)

  editor.apply({
    type: 'set_node',
    path: nodePath,
    properties: {[name]: previousValue},
    newProperties: {[name]: undefined},
  })
}
