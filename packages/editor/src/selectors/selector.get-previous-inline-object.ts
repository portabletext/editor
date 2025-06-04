import {type PortableTextObject} from '@sanity/types'
import {isIndexedSelectionPoint} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {ChildPath} from '../types/paths'
import {isKeyedSegment, isSpan} from '../utils'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {getSelectionStartBlock} from './selectors'

/**
 * @public
 */
export const getPreviousInlineObject: EditorSelector<
  | {
      node: PortableTextObject
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const startBlock = getSelectionStartBlock(snapshot)
  const startPoint = getSelectionStartPoint(snapshot)

  if (!startBlock || !startPoint) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, startBlock.node)) {
    return undefined
  }

  const startPointBlockIndex = isIndexedSelectionPoint(startPoint)
    ? startPoint.path.at(0)
    : undefined
  const startPointChildIndex = isIndexedSelectionPoint(startPoint)
    ? startPoint.path.at(1)
    : undefined

  const startPointChildKey =
    startPointChildIndex !== undefined
      ? startBlock.node.children.at(startPointChildIndex)?._key
      : isKeyedSegment(startPoint.path[2])
        ? startPoint.path[2]._key
        : undefined

  let inlineObject:
    | {
        node: PortableTextObject
        path: ChildPath
      }
    | undefined

  let childIndex = 0
  for (const child of startBlock.node.children) {
    childIndex++

    if (child._key === startPointChildKey) {
      break
    }

    if (!isSpan(snapshot.context, child)) {
      inlineObject = {
        node: child,
        path:
          isIndexedSelectionPoint(startPoint) &&
          startPointBlockIndex !== undefined
            ? [startPointBlockIndex, childIndex]
            : [{_key: startBlock.node._key}, 'children', {_key: child._key}],
      }
    }
  }

  return inlineObject
}
