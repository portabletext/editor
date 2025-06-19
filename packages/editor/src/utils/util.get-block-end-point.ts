import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelectionPoint} from '../types/editor'
import type {BlockPath} from '../types/paths'

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
    path: BlockPath
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    const lastChild = block.node.children[block.node.children.length - 1]

    if (lastChild) {
      return {
        path: [...block.path, 'children', {_key: lastChild._key}],
        offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
      }
    }
  }

  return {
    path: block.path,
    offset: 0,
  }
}
