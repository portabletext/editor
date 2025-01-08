import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
} from '@sanity/types'
import type {BlockOffset} from '../behaviors/behavior.types'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
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

/**
 * @public
 */
export function spanSelectionPointToBlockOffset({
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
  const spanKey = isKeyedSegment(selectionPoint.path[2])
    ? selectionPoint.path[2]._key
    : undefined

  if (!blockKey || !spanKey) {
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
      if (!isPortableTextSpan(child)) {
        continue
      }

      if (child._key === spanKey) {
        return {
          path: [{_key: block._key}],
          offset: offset + selectionPoint.offset,
        }
      }

      offset += child.text.length
    }
  }
}
