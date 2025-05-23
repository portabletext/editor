import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {EditorSelectionPoint} from '../types/selection'

/**
 * @public
 */
export function getBlockEndPoint({
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
    const lastChild = block.node.children[block.node.children.length - 1]

    if (lastChild) {
      return {
        path: [...block.path, block.node.children.length - 1],
        offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
      }
    }
  }

  return {
    path: block.path,
    offset: 0,
  }
}
