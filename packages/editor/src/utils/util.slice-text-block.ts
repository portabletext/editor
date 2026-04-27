import {
  isSpan,
  type PortableTextChild,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Return a shallow copy of `block` that contains the content between
 * `startPoint` and `endPoint`. Depth-agnostic: resolves child keys from the
 * last segment of each point's path, so it works for blocks at any depth
 * (including inside editable containers).
 */
export function sliceTextBlock({
  context,
  block,
  startPoint,
  endPoint,
}: {
  context: Pick<EditorContext, 'schema'>
  block: PortableTextTextBlock
  startPoint: EditorSelectionPoint
  endPoint: EditorSelectionPoint
}): PortableTextTextBlock {
  const startChildSegment = startPoint.path.at(-1)
  const endChildSegment = endPoint.path.at(-1)
  const startChildKey = isKeyedSegment(startChildSegment)
    ? startChildSegment._key
    : undefined
  const endChildKey = isKeyedSegment(endChildSegment)
    ? endChildSegment._key
    : undefined

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
