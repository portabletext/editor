import {Transforms} from 'slate'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
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

  Transforms.moveNodes(operation.editor, {
    at: [originBlockIndex],
    to: [destinationBlockIndex],
    mode: 'highest',
  })
}
