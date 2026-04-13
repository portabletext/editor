import {getNode} from '../node-traversal/get-node'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import type {OperationImplementation} from './operation.types'

export const moveBlockOperationImplementation: OperationImplementation<
  'move.block'
> = ({operation}) => {
  const originKey = getBlockKeyFromSelectionPoint({
    path: operation.at,
    offset: 0,
  })

  if (!originKey) {
    throw new Error('Failed to get block key from selection point')
  }

  const originBlockIndex = operation.editor.blockIndexMap.get(originKey)

  if (originBlockIndex === undefined) {
    throw new Error('Failed to get block index from block key')
  }

  const destinationKey = getBlockKeyFromSelectionPoint({
    path: operation.to,
    offset: 0,
  })

  if (!destinationKey) {
    throw new Error('Failed to get block key from selection point')
  }

  const destinationBlockIndex =
    operation.editor.blockIndexMap.get(destinationKey)

  if (destinationBlockIndex === undefined) {
    throw new Error('Failed to get block index from block key')
  }

  const editor = operation.editor
  const nodeEntry = getNode(editor, [{_key: originKey}])

  if (!nodeEntry) {
    return
  }

  const node = nodeEntry.node

  const savedSelection = editor.selection

  const movingDown = originBlockIndex < destinationBlockIndex

  withoutNormalizing(editor, () => {
    editor.apply({
      type: 'unset',
      path: [{_key: node._key}],
    })
    editor.apply({
      type: 'insert',
      path: [{_key: destinationKey}],
      node,
      position: movingDown ? 'after' : 'before',
    })
  })

  if (savedSelection) {
    editor.selection = savedSelection
  }
}
