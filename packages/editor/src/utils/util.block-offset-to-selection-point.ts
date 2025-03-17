import type {PortableTextBlock} from '@sanity/types'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'
import {blockOffsetToBlockSelectionPoint} from './util.block-offset-to-block-selection-point'

/**
 * @public
 */
export function blockOffsetToSelectionPoint({
  value,
  blockOffset,
  direction,
}: {
  value: Array<PortableTextBlock>
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}): EditorSelectionPoint | undefined {
  const spanSelectionPoint = blockOffsetToSpanSelectionPoint({
    value,
    blockOffset,
    direction,
  })

  if (!spanSelectionPoint) {
    return blockOffsetToBlockSelectionPoint({
      value,
      blockOffset,
    })
  }

  return spanSelectionPoint
}
