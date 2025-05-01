import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'
import {blockOffsetToBlockSelectionPoint} from './util.block-offset-to-block-selection-point'

/**
 * @public
 */
export function blockOffsetToSelectionPoint({
  context,
  blockOffset,
  direction,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}): EditorSelectionPoint | undefined {
  const spanSelectionPoint = blockOffsetToSpanSelectionPoint({
    context,
    blockOffset,
    direction,
  })

  if (!spanSelectionPoint) {
    return blockOffsetToBlockSelectionPoint({
      context,
      blockOffset,
    })
  }

  return spanSelectionPoint
}
