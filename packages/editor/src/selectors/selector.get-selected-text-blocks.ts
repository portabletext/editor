import type {KeyedSegment, PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import {getSelectionEndPoint, getSelectionStartPoint} from '../utils'

/**
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: [KeyedSegment]}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedTextBlocks: Array<{
    node: PortableTextTextBlock
    path: [KeyedSegment]
  }> = []

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const endPoint = getSelectionEndPoint(snapshot.context.selection)
  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return selectedTextBlocks
  }

  for (const block of snapshot.context.value) {
    if (block._key === startBlockKey) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }

      if (startBlockKey === endBlockKey) {
        break
      }
      continue
    }

    if (block._key === endBlockKey) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }

      break
    }

    if (selectedTextBlocks.length > 0) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path: [{_key: block._key}]})
      }
    }
  }

  return selectedTextBlocks
}
