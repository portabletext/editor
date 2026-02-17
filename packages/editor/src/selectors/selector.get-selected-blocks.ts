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

  const startEntry = snapshot.blockMap.get(startKey)

  if (!startEntry) {
    return selectedBlocks
  }

  // Walk the linked list from start to end
  let currentKey: string | null = startKey

  while (currentKey !== null) {
    const entry = snapshot.blockMap.get(currentKey)

    if (!entry) {
      break
    }

    const node = snapshot.context.value[entry.index]

    if (!node) {
      break
    }

    selectedBlocks.push({node, path: [{_key: node._key}]})

    if (currentKey === endKey) {
      break
    }

    currentKey = entry.next
  }

  return selectedBlocks
}
