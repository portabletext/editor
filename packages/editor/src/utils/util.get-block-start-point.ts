import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '../editor/editor-selection'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {type BlockPath} from '../types/paths'

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
  const blockPathSegment = block.path.at(0)

  if (blockPathSegment === undefined) {
    throw new Error('Block path is empty')
  }

  if (typeof blockPathSegment === 'number') {
    if (isTextBlock(context, block.node)) {
      return {
        path: [blockPathSegment, 0],
        offset: 0,
      }
    }

    return {
      path: [blockPathSegment],
      offset: 0,
    }
  }

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
