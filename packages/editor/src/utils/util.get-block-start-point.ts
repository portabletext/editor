import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelectionPoint} from '../types/editor'
import type {BlockPath} from '../types/paths'

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
    path: BlockPath
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
