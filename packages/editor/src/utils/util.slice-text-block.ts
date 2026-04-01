import {
  isSpan,
  type PortableTextChild,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {getSelectionEndPoint} from './util.get-selection-end-point'
import {getSelectionStartPoint} from './util.get-selection-start-point'
import {isKeyedSegment} from './util.is-keyed-segment'

function getTextBlockKeyFromPoint(point: EditorSelectionPoint) {
  const childrenIndex = point.path.indexOf('children')
  if (childrenIndex < 1) {
    return undefined
  }
  const blockSegment = point.path.at(childrenIndex - 1)
  return isKeyedSegment(blockSegment) ? blockSegment._key : undefined
}

function getChildKeyFromPoint(point: EditorSelectionPoint) {
  const childrenIndex = point.path.indexOf('children')
  if (childrenIndex < 0) {
    return undefined
  }
  const childSegment = point.path.at(childrenIndex + 1)
  return isKeyedSegment(childSegment) ? childSegment._key : undefined
}

export function sliceTextBlock({
  context,
  block,
}: {
  context: Pick<EditorContext, 'schema' | 'selection'>
  block: PortableTextTextBlock
}): PortableTextTextBlock {
  const startPoint = getSelectionStartPoint(context.selection)
  const endPoint = getSelectionEndPoint(context.selection)

  if (!startPoint || !endPoint) {
    return block
  }

  const startBlockKey = getTextBlockKeyFromPoint(startPoint)
  const endBlockKey = getTextBlockKeyFromPoint(endPoint)

  if (startBlockKey !== endBlockKey || startBlockKey !== block._key) {
    return block
  }

  const startChildKey = getChildKeyFromPoint(startPoint)
  const endChildKey = getChildKeyFromPoint(endPoint)

  if (!startChildKey || !endChildKey) {
    return block
  }

  let startChildFound = false
  const children: Array<PortableTextChild> = []

  for (const child of block.children) {
    if (child._key === startChildKey) {
      startChildFound = true

      if (isSpan(context, child)) {
        const text =
          child._key === endChildKey
            ? child.text.slice(startPoint.offset, endPoint.offset)
            : child.text.slice(startPoint.offset)

        children.push({
          ...child,
          text,
        })
      } else {
        children.push(child)
      }

      if (startChildKey === endChildKey) {
        break
      }

      continue
    }

    if (child._key === endChildKey) {
      if (isSpan(context, child)) {
        children.push({
          ...child,
          text: child.text.slice(0, endPoint.offset),
        })
      } else {
        children.push(child)
      }

      break
    }

    if (startChildFound) {
      children.push(child)
    }
  }

  return {
    ...block,
    children,
  }
}
