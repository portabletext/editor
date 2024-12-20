import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
} from '@sanity/types'
import type {EditorSelectionPoint} from '../../types/editor'

export function getEndPoint({
  node,
  path,
}: {
  node: PortableTextBlock
  path: [KeyedSegment]
}): EditorSelectionPoint {
  if (isPortableTextTextBlock(node)) {
    const lastChild = node.children[node.children.length - 1]
    return {
      path: [...path, 'children', {_key: lastChild._key}],
      offset: isPortableTextSpan(lastChild) ? lastChild.text.length : 0,
    }
  }

  return {
    path,
    offset: 0,
  }
}
