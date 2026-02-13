import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import {sliceBlocks} from '../utils/util.slice-blocks'

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

  const startEntry = snapshot.blockIndexMap.get(startBlockKey)
  const endEntry = snapshot.blockIndexMap.get(endBlockKey)

  if (startEntry === undefined || endEntry === undefined) {
    return []
  }

  const startBlock = snapshot.context.value.at(startEntry.index)
  const slicedStartBlock = startBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [startBlock],
      }).at(0)
    : undefined

  if (startEntry.index === endEntry.index) {
    return slicedStartBlock ? [slicedStartBlock] : []
  }

  const endBlock = snapshot.context.value.at(endEntry.index)
  const slicedEndBlock = endBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [endBlock],
      }).at(0)
    : undefined

  const middleBlocks = snapshot.context.value.slice(
    startEntry.index + 1,
    endEntry.index,
  )

  return [
    ...(slicedStartBlock ? [slicedStartBlock] : []),
    ...middleBlocks,
    ...(slicedEndBlock ? [slicedEndBlock] : []),
  ]
}
