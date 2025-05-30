import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import {EditorSelectionPoint} from '../types/editor'

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
