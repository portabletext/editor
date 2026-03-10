import type {PortableTextBlock} from '@portabletext/schema'
import {getIndexForKey} from '@sanity/json-match'
import {applyMoveNode} from '../internal-utils/apply-move-node'
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

  const originBlockIndex = getIndexForKey(operation.editor.children as Array<PortableTextBlock>, originKey)

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

  const destinationBlockIndex = getIndexForKey(
    operation.editor.children as Array<PortableTextBlock>,
    destinationKey,
  )

  if (destinationBlockIndex === undefined) {
    throw new Error('Failed to get block index from block key')
  }

  applyMoveNode(operation.editor, [originBlockIndex], [destinationBlockIndex])
}
