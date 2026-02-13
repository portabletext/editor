import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

/**
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: BlockPath}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks: Array<{node: PortableTextBlock; path: BlockPath}> = []
  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const endPoint = getSelectionEndPoint(snapshot.context.selection)
  const startKey = getBlockKeyFromSelectionPoint(startPoint)
  const endKey = getBlockKeyFromSelectionPoint(endPoint)

  if (!startKey || !endKey) {
    return selectedBlocks
  }

  const startEntry = snapshot.blockIndexMap.get(startKey)
  const endEntry = snapshot.blockIndexMap.get(endKey)

  if (startEntry === undefined || endEntry === undefined) {
    return selectedBlocks
  }

  const slicedValue = snapshot.context.value.slice(
    startEntry.index,
    endEntry.index + 1,
  )

  for (const block of slicedValue) {
    const blockEntry = snapshot.blockIndexMap.get(block._key)
    const path = blockEntry?.path ?? [{_key: block._key}]

    if (block._key === startKey) {
      selectedBlocks.push({node: block, path})

      if (startKey === endKey) {
        break
      }
      continue
    }

    if (block._key === endKey) {
      selectedBlocks.push({node: block, path})
      break
    }

    if (selectedBlocks.length > 0) {
      selectedBlocks.push({node: block, path})
    }
  }

  return selectedBlocks
}
