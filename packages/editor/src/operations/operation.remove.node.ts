import {getNode} from '../node-traversal/get-node'
import type {OperationImplementation} from './operation.types'

export const removeNodeOperationImplementation: OperationImplementation<
  'remove.node'
> = ({operation}) => {
  const {editor, at} = operation

  const entry = getNode(editor, at)

  if (!entry) {
    console.error(`remove.node: no node found at path`)
    return
  }

  editor.apply({
    type: 'remove_node',
    path: entry.path,
    node: entry.node,
  })
}
