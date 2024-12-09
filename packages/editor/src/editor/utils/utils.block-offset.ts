import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
} from '@sanity/types'
import type {BlockOffset} from '../../behaviors/behavior.types'

export function blockOffsetToSpanSelectionPoint({
  value,
  blockOffset,
}: {
  value: Array<PortableTextBlock>
  blockOffset: BlockOffset
}) {
  let offsetLeft = blockOffset.offset
  let selectionPoint:
    | {path: [KeyedSegment, 'children', KeyedSegment]; offset: number}
    | undefined

  for (const block of value) {
    if (block._key !== blockOffset.path[0]._key) {
      continue
    }

    if (!isPortableTextTextBlock(block)) {
      continue
    }

    for (const child of block.children) {
      if (!isPortableTextSpan(child)) {
        continue
      }

      if (offsetLeft === 0) {
        selectionPoint = {
          path: [...blockOffset.path, 'children', {_key: child._key}],
          offset: 0,
        }
        break
      }

      if (offsetLeft <= child.text.length) {
        selectionPoint = {
          path: [...blockOffset.path, 'children', {_key: child._key}],
          offset: offsetLeft,
        }
        break
      }

      offsetLeft -= child.text.length
    }
  }

  return selectionPoint
}

export function spanSelectionPointToBlockOffset({
  value,
  selectionPoint,
}: {
  value: Array<PortableTextBlock>
  selectionPoint: {
    path: [KeyedSegment, 'children', KeyedSegment]
    offset: number
  }
}): BlockOffset | undefined {
  let offset = 0

  for (const block of value) {
    if (block._key !== selectionPoint.path[0]._key) {
      continue
    }

    if (!isPortableTextTextBlock(block)) {
      continue
    }

    for (const child of block.children) {
      if (!isPortableTextSpan(child)) {
        continue
      }

      if (child._key === selectionPoint.path[2]._key) {
        return {
          path: [{_key: block._key}],
          offset: offset + selectionPoint.offset,
        }
      }

      offset += child.text.length
    }
  }
}
