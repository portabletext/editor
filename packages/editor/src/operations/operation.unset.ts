import {getNode} from '../node-traversal/get-node'
import type {OperationImplementation} from './operation.types'

export const unsetOperationImplementation: OperationImplementation<'unset'> = ({
  operation,
}) => {
  const {editor, at, name} = operation

  const entry = getNode(editor, at)

  if (!entry) {
    console.error(`unset: no node found at path`)
    return
  }

  const nodeRecord = entry.node as Record<string, unknown>

  if (!(name in nodeRecord)) {
    return
  }

  editor.apply({
    type: 'set_node',
    path: entry.path,
    properties: {[name]: nodeRecord[name]},
    newProperties: {[name]: undefined},
  })
}
