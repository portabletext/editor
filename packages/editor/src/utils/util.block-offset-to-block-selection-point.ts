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
  let selectionPoint: EditorSelectionPoint | undefined

  const lastPathSegment = blockOffset.path.at(-1)

  if (!lastPathSegment || !isKeyedSegment(lastPathSegment)) {
    return undefined
  }

  for (const block of context.value) {
    if (block._key === lastPathSegment._key) {
      selectionPoint = {
        path: [{_key: block._key}],
        offset: blockOffset.offset,
      }
      break
    }
  }

  return selectionPoint
}
