import {resolveBlockIndex} from '../internal-utils/resolve-key-path'
import type {OperationImplementation} from './operation.types'

export const moveBlockOperationImplementation: OperationImplementation<
  'move.block'
> = ({operation}) => {
  const originKey = operation.at[0]._key
  const destinationKey = operation.to[0]._key

  const originBlockIndex = resolveBlockIndex(operation.editor, originKey)

  if (originBlockIndex === undefined) {
    throw new Error(
      `Unable to find block with key "${originKey}" for move origin`,
    )
  }

  const destinationBlockIndex = resolveBlockIndex(
    operation.editor,
    destinationKey,
  )

  if (destinationBlockIndex === undefined) {
    throw new Error(
      `Unable to find block with key "${destinationKey}" for move destination`,
    )
  }

  operation.editor.apply({
    type: 'move_node',
    path: [originBlockIndex],
    newPath: [destinationBlockIndex],
  })
}
