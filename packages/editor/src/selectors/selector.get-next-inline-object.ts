import {
  isKeySegment,
  type KeyedSegment,
  type PortableTextObject,
} from '@sanity/types'
import {isIndexedSelectionPoint} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {ChildPath} from '../types/paths'
import {isKeyedSegment, isSpan, isTextBlock} from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getFocusTextBlock, getSelectionEndBlock} from './selectors'

/**
 * @public
 */
export const getNextInlineObject: EditorSelector<
  | {
      node: PortableTextObject
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const endBlock = getSelectionEndBlock(snapshot)
  const endPoint = getSelectionEndPoint(snapshot)

  if (!endBlock || !endPoint) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, endBlock.node)) {
    return undefined
  }

  const endPointBlockIndex = isIndexedSelectionPoint(endPoint)
    ? endPoint.path.at(0)
    : undefined
  const endPointChildIndex = isIndexedSelectionPoint(endPoint)
    ? endPoint.path.at(1)
    : undefined

  const endPointChildKey =
    endPointChildIndex !== undefined
      ? endBlock.node.children.at(endPointChildIndex)?._key
      : isKeyedSegment(endPoint.path[2])
        ? endPoint.path[2]._key
        : undefined

  let endPointChildFound = false
  let inlineObject:
    | {
        node: PortableTextObject
        path: ChildPath
      }
    | undefined

  let childIndex = 0
  for (const child of endBlock.node.children) {
    childIndex++

    if (child._key === endPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpan(snapshot.context, child) && endPointChildFound) {
      inlineObject = {
        node: child,
        path:
          isIndexedSelectionPoint(endPoint) && endPointBlockIndex !== undefined
            ? [endPointBlockIndex, childIndex]
            : [{_key: endBlock.node._key}, 'children', {_key: child._key}],
      }
      break
    }
  }

  return inlineObject
}
