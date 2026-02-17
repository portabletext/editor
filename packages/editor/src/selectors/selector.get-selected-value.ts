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

  const startEntry = snapshot.blockMap.get(startBlockKey)
  const endEntry = snapshot.blockMap.get(endBlockKey)

  if (!startEntry || !endEntry) {
    return []
  }

  const startNode = snapshot.context.value[startEntry.index]
  const endNode = snapshot.context.value[endEntry.index]

  if (!startNode || !endNode) {
    return []
  }

  const slicedStartBlock = sliceBlocks({
    context: snapshot.context,
    blocks: [startNode],
  }).at(0)

  if (startBlockKey === endBlockKey) {
    return slicedStartBlock ? [slicedStartBlock] : []
  }

  const slicedEndBlock = sliceBlocks({
    context: snapshot.context,
    blocks: [endNode],
  }).at(0)

  // Collect middle blocks by walking the linked list
  const middleBlocks: Array<PortableTextBlock> = []
  let currentKey = startEntry.next

  while (currentKey !== null && currentKey !== endBlockKey) {
    const entry = snapshot.blockMap.get(currentKey)

    if (!entry) {
      break
    }

    const node = snapshot.context.value[entry.index]

    if (node) {
      middleBlocks.push(node)
    }
    currentKey = entry.next
  }

  return [
    ...(slicedStartBlock ? [slicedStartBlock] : []),
    ...middleBlocks,
    ...(slicedEndBlock ? [slicedEndBlock] : []),
  ]
}
