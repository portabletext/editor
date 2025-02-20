import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from '@sanity/types'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function childSelectionPointToBlockOffset({
  value,
  selectionPoint,
}: {
  value: Array<PortableTextBlock>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  let offset = 0

  const blockKey = isKeyedSegment(selectionPoint.path[0])
    ? selectionPoint.path[0]._key
    : undefined
  const childKey = isKeyedSegment(selectionPoint.path[2])
    ? selectionPoint.path[2]._key
    : undefined

  if (!blockKey || !childKey) {
    return undefined
  }

  for (const block of value) {
    if (block._key !== blockKey) {
      continue
    }

    if (!isPortableTextTextBlock(block)) {
      continue
    }

    for (const child of block.children) {
      if (child._key === childKey) {
        return {
          path: [{_key: block._key}],
          offset: offset + selectionPoint.offset,
        }
      }

      if (isPortableTextSpan(child)) {
        offset += child.text.length
      }
    }
  }
}
