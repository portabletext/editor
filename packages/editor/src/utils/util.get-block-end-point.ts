import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {KeyedBlockPath} from '../types/paths'

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
    path: KeyedBlockPath
    index: number
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    const lastChild = block.node.children[block.node.children.length - 1]

    if (lastChild) {
      return {
        path: [block.index, block.node.children.length - 1],
        offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
      }
    }
  }

  return {
    path: [block.index],
    offset: 0,
  }
}
