import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'

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
  const blockSegment = blockOffset.path.at(0)

  if (!isKeyedSegment(blockSegment)) {
    return undefined
  }

  let selectionPoint: EditorSelectionPoint | undefined

  for (const block of context.value) {
    if (block._key === blockSegment._key) {
      selectionPoint = {
        path: [{_key: block._key}],
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
