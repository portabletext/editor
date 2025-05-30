import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {isIndexedBlockPath, type BlockPath} from '../types/paths'

/**
 * @public
 */
export function getBlockStartPoint({
  context,
  block,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  block: {
    node: PortableTextBlock
    path: BlockPath
  }
}): EditorSelectionPoint {
  const blockPath = block.path
  const blockIndex = isIndexedBlockPath(blockPath)
    ? blockPath.at(0)
    : context.value.findIndex((b) => b._key === blockPath[0]._key)

  if (blockIndex === undefined) {
    throw new Error('Unable to find block index when getting block start point')
  }

  if (isTextBlock(context, block.node)) {
    return {
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  return {
    path: [blockIndex],
    offset: 0,
  }
}
