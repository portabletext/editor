import {getNode} from '../traversal/get-node'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'

export function blockOffsetToBlockSelectionPoint({
  snapshot,
  blockOffset,
}: {
  snapshot: TraversalSnapshot
  blockOffset: BlockOffset
}): EditorSelectionPoint | undefined {
  const blockEntry = getNode(snapshot, blockOffset.path)

  if (!blockEntry) {
    return undefined
  }

  return {
    path: blockEntry.path,
    offset: blockOffset.offset,
  }
}
