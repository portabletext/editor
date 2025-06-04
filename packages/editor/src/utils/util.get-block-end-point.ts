import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '../editor/editor-selection'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {type BlockPath} from '../types/paths'

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
  const blockPathSegment = block.path.at(0)

  if (blockPathSegment === undefined) {
    throw new Error('Block path is empty')
  }

  if (typeof blockPathSegment === 'number') {
    if (isTextBlock(context, block.node)) {
      const lastChild = block.node.children[block.node.children.length - 1]

      if (lastChild) {
        return {
          path: [blockPathSegment, block.node.children.length - 1],
          offset: isSpan(context, lastChild) ? lastChild.text.length : 0,
        }
      }
    }

    return {
      path: [blockPathSegment],
      offset: 0,
    }
  }

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
