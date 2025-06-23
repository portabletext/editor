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

  const slicedValue = snapshot.context.value.slice(
    startBlockIndex,
    endBlockIndex + 1,
  )

  return sliceBlocks({
    context: snapshot.context,
    blocks: slicedValue,
  })
}
