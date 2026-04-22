import type {EditorContext} from '../editor/editor-snapshot'
import {getNode} from '../node-traversal/get-node'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function blockOffsetToBlockSelectionPoint({
  context,
  blockOffset,
}: {
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>
  blockOffset: BlockOffset
}): EditorSelectionPoint | undefined {
  const blockEntry = getNode(context, blockOffset.path)

  if (!blockEntry) {
    return undefined
  }

  return {
    path: blockEntry.path,
    offset: blockOffset.offset,
  }
}
