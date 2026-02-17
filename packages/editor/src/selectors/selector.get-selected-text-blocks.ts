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

  const startEntry = snapshot.blockMap.get(startBlockKey)

  if (!startEntry) {
    return selectedTextBlocks
  }

  // Walk the linked list from start to end
  let currentKey: string | null = startBlockKey

  while (currentKey !== null) {
    const entry = snapshot.blockMap.get(currentKey)

    if (!entry) {
      break
    }

    const node = snapshot.context.value[entry.index]

    if (node && isTextBlock(snapshot.context, node)) {
      selectedTextBlocks.push({
        node,
        path: [{_key: node._key}],
      })
    }

    if (currentKey === endBlockKey) {
      break
    }

    currentKey = entry.next
  }

  return selectedTextBlocks
}
