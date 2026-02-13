import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

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

  const startEntry = snapshot.blockIndexMap.get(startBlockKey)
  const endEntry = snapshot.blockIndexMap.get(endBlockKey)

  if (startEntry === undefined || endEntry === undefined) {
    return selectedTextBlocks
  }

  const slicedValue = snapshot.context.value.slice(
    startEntry.index,
    endEntry.index + 1,
  )

  for (const block of slicedValue) {
    const blockEntry = snapshot.blockIndexMap.get(block._key)
    const path = blockEntry?.path ?? [{_key: block._key}]

    if (block._key === startBlockKey) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path})
      }

      if (startBlockKey === endBlockKey) {
        break
      }
      continue
    }

    if (block._key === endBlockKey) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path})
      }

      break
    }

    if (selectedTextBlocks.length > 0) {
      if (isTextBlock(snapshot.context, block)) {
        selectedTextBlocks.push({node: block, path})
      }
    }
  }

  return selectedTextBlocks
}
