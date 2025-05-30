import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {isIndexedBlockPath, type BlockPath} from '../types/paths'

/**
 * @public
 */
export function getBlockEndPoint({
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
    throw new Error('Unable to find block index when getting block end point')
  }

  if (isTextBlock(context, block.node)) {
    const lastChild = block.node.children[block.node.children.length - 1]

    if (lastChild) {
      return {
        path: [blockIndex, block.node.children.length - 1],
        offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
      }
    }
  }

  return {
    path: [blockIndex],
    offset: 0,
  }
}
