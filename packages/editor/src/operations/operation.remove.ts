import {getNode} from '../node-traversal/get-node'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import type {OperationImplementation} from './operation.types'

export const removeOperationImplementation: OperationImplementation<
  'remove'
> = ({operation}) => {
  const {editor} = operation

  const indexedPath = keyedPathToIndexedPath(
    editor,
    operation.at,
    editor.blockIndexMap,
  )

  if (!indexedPath) {
    return
  }

  const entry = getNode(editor, indexedPath)

  if (!entry) {
    return
  }

  editor.apply({type: 'remove_node', path: indexedPath, node: entry.node})
}
