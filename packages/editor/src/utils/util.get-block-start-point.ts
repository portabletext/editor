import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {KeyedBlockPath} from '../types/paths'

/**
 * @public
 */
export function getBlockStartPoint({
  context,
  block,
}: {
  context: Pick<EditorContext, 'schema'>
  block: {
    node: PortableTextBlock
    path: KeyedBlockPath
    index: number
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    return {
      path: [block.index, 0],
      offset: 0,
    }
  }

  return {
    path: [block.index],
    offset: 0,
  }
}
