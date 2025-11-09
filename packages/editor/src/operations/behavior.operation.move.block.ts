import {Transforms} from 'slate'
import {blockPathToSlatePath} from '../internal-utils/block-path-utils'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({operation}) => {
  const originKey = getBlockKeyFromSelectionPoint({
    path: operation.at,
    offset: 0,
  })

  if (!originKey) {
    throw new Error('Failed to get block key from selection point')
  }

  const originBlockPath = operation.editor.blockIndexMap.get(originKey)

  if (originBlockPath === undefined) {
    throw new Error('Failed to get block index from block key')
  }

  const destinationKey = getBlockKeyFromSelectionPoint({
    path: operation.to,
    offset: 0,
  })

  if (!destinationKey) {
    throw new Error('Failed to get block key from selection point')
  }

  const destinationBlockPath =
    operation.editor.blockIndexMap.get(destinationKey)

  if (destinationBlockPath === undefined) {
    throw new Error('Failed to get block index from block key')
  }

  Transforms.moveNodes(operation.editor, {
    at: blockPathToSlatePath(originBlockPath),
    to: blockPathToSlatePath(destinationBlockPath),
    mode: 'highest',
  })
}
