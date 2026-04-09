import {
  isSpan,
  type PortableTextChild,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from './util.get-selection-end-point'
import {getSelectionStartPoint} from './util.get-selection-start-point'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * Extract the child key from a selection point path.
 * The child is always the last keyed segment in the path.
 */
function childKeyFromPath(path: Path): string | undefined {
  const lastSegment = path.at(-1)
  return isKeyedSegment(lastSegment) ? lastSegment._key : undefined
}

/**
 * Check whether a selection point path refers to a child within the given block.
 * Walks the path looking for the block's key followed by a field name and a child key.
 */
function isPathWithinBlock(path: Path, blockKey: string): boolean {
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (isKeyedSegment(segment) && segment._key === blockKey) {
      return true
    }
  }
  return false
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

  if (
    !isPathWithinBlock(startPoint.path, block._key) ||
    !isPathWithinBlock(endPoint.path, block._key)
  ) {
    return block
  }

  const startChildKey = childKeyFromPath(startPoint.path)
  const endChildKey = childKeyFromPath(endPoint.path)

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
