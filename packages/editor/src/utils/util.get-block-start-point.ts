import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelectionPoint} from '../types/editor'

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
    path: [KeyedSegment]
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    return {
      path: [...block.path, 'children', {_key: block.node.children[0]._key}],
      offset: 0,
    }
  }

  return {
    path: block.path,
    offset: 0,
  }
}
