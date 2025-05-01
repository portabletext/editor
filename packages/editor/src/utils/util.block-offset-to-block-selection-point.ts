import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'

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

  for (const block of context.value) {
    if (block._key === blockOffset.path[0]._key) {
      selectionPoint = {
        path: [{_key: block._key}],
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
