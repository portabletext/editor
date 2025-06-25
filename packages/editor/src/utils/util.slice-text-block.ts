import type {PortableTextChild, PortableTextTextBlock} from '@sanity/types'
import type {EditorContext} from '..'
import {isSpan} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import {getSelectionEndPoint} from './util.get-selection-end-point'
import {getSelectionStartPoint} from './util.get-selection-start-point'

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

  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)

  if (startBlockKey !== endBlockKey || startBlockKey !== block._key) {
    return block
  }

  const startChildKey = getChildKeyFromSelectionPoint(startPoint)
  const endChildKey = getChildKeyFromSelectionPoint(endPoint)

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
