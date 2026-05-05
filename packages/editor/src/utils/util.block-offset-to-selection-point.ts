import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'
import {blockOffsetToBlockSelectionPoint} from './util.block-offset-to-block-selection-point'

export function blockOffsetToSelectionPoint({
  snapshot,
  blockOffset,
  direction,
}: {
  snapshot: TraversalSnapshot
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}): EditorSelectionPoint | undefined {
  const spanSelectionPoint = blockOffsetToSpanSelectionPoint({
    snapshot,
    blockOffset,
    direction,
  })

  if (!spanSelectionPoint) {
    return blockOffsetToBlockSelectionPoint({
      snapshot,
      blockOffset,
    })
  }

  return spanSelectionPoint
}
