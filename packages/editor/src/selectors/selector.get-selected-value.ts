import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import {
  getSelectionEndPoint,
  getSelectionStartPoint,
  sliceBlocks,
} from '../utils'

/**
 * @public
 */
export const getSelectedValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return []
  }

  const startPoint = getSelectionStartPoint(selection)
  const endPoint = getSelectionEndPoint(selection)
  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return []
  }

  const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
  const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

  if (startBlockIndex === undefined || endBlockIndex === undefined) {
    return []
  }

  const startBlock = snapshot.context.value.at(startBlockIndex)
  const slicedStartBlock = startBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [startBlock],
      }).at(0)
    : undefined

  if (startBlockIndex === endBlockIndex) {
    return slicedStartBlock ? [slicedStartBlock] : []
  }

  const endBlock = snapshot.context.value.at(endBlockIndex)
  const slicedEndBlock = endBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [endBlock],
      }).at(0)
    : undefined

  const middleBlocks = snapshot.context.value.slice(
    startBlockIndex + 1,
    endBlockIndex,
  )

  return [
    ...(slicedStartBlock ? [slicedStartBlock] : []),
    ...middleBlocks,
    ...(slicedEndBlock ? [slicedEndBlock] : []),
  ]
}
