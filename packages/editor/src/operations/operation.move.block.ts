import {Node, type Point} from '../slate'
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
  const node = Node.get(editor, [originBlockIndex], editor.schema)
  const savedSelection = editor.selection
    ? {anchor: {...editor.selection.anchor}, focus: {...editor.selection.focus}}
    : null

  withoutNormalizing(editor, () => {
    editor.apply({type: 'remove_node', path: [originBlockIndex], node})
    editor.apply({type: 'insert_node', path: [destinationBlockIndex], node})
  })

  if (savedSelection) {
    const fixPoint = (point: Point): Point => {
      if (point.path[0] === originBlockIndex) {
        return {
          ...point,
          path: [destinationBlockIndex, ...point.path.slice(1)],
        }
      }
      return point
    }
    editor.selection = {
      anchor: fixPoint(savedSelection.anchor),
      focus: fixPoint(savedSelection.focus),
    }
  }
}
