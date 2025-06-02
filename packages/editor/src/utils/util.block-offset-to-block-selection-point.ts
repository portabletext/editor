import type {EditorSelectionPoint} from '../editor/editor-selection'
import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import {isIndexedBlockPath} from '../types/paths'

/**
 * @public
 */
export function blockOffsetToBlockSelectionPoint({
  context,
  blockOffset,
}: {
  context: Pick<EditorContext, 'value'>
  blockOffset: BlockOffset
}): EditorSelectionPoint | undefined {
  if (isIndexedBlockPath(blockOffset.path)) {
    return {
      path: blockOffset.path,
      offset: blockOffset.offset,
    }
  }

  let selectionPoint: EditorSelectionPoint | undefined

  let blockIndex = -1

  for (const block of context.value) {
    blockIndex++

    if (block._key === blockOffset.path[0]._key) {
      selectionPoint = {
        path: [blockIndex],
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
