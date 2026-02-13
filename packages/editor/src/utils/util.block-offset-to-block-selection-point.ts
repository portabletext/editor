import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {getBlockKeyFromPath} from './util.path-helpers'

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
  const blockKey = getBlockKeyFromPath(blockOffset.path)
  let selectionPoint: EditorSelectionPoint | undefined

  for (const block of context.value) {
    if (block._key === blockKey) {
      selectionPoint = {
        path: blockOffset.path,
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
