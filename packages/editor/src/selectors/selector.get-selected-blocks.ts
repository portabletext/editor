import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

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

  for (const block of snapshot.context.value) {
    if (block._key === startKey) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})

      if (startKey === endKey) {
        break
      }
      continue
    }

    if (block._key === endKey) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})
      break
    }

    if (selectedBlocks.length > 0) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})
    }
  }

  return selectedBlocks
}
