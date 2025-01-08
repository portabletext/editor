import {
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
} from '@sanity/types'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function getBlockStartPoint({
  node,
  path,
}: {
  node: PortableTextBlock
  path: [KeyedSegment]
}): EditorSelectionPoint {
  if (isPortableTextTextBlock(node)) {
    return {
      path: [...path, 'children', {_key: node.children[0]._key}],
      offset: 0,
    }
  }

  return {
    path,
    offset: 0,
  }
}
