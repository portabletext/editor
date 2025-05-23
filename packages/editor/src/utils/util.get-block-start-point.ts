import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {EditorSelectionPoint} from '../types/selection'

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
    path: [number]
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    return {
      path: [...block.path, 0],
      offset: 0,
    }
  }

  return {
    path: block.path,
    offset: 0,
  }
}
