import {Transforms} from 'slate'
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

  const originEntry = operation.editor.blockMap.get(originKey)

  if (!originEntry) {
    throw new Error('Failed to get block entry from block key')
  }

  const destinationKey = getBlockKeyFromSelectionPoint({
    path: operation.to,
    offset: 0,
  })

  if (!destinationKey) {
    throw new Error('Failed to get block key from selection point')
  }

  const destinationEntry = operation.editor.blockMap.get(destinationKey)

  if (!destinationEntry) {
    throw new Error('Failed to get block entry from block key')
  }

  Transforms.moveNodes(operation.editor, {
    at: [originEntry.index],
    to: [destinationEntry.index],
    mode: 'highest',
  })
}
