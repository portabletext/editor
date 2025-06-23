import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint, getSelectionStartPoint} from '../utils'

/**
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: BlockPath}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedTextBlocks: Array<{
    node: PortableTextTextBlock
    path: BlockPath
  }> = []

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const endPoint = getSelectionEndPoint(snapshot.context.selection)
  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return selectedTextBlocks
  }

  const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
  const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

  if (startBlockIndex === undefined || endBlockIndex === undefined) {
    return selectedTextBlocks
  }

  const slicedValue = snapshot.context.value.slice(
    startBlockIndex,
    endBlockIndex + 1,
  )

  for (const block of slicedValue) {
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
