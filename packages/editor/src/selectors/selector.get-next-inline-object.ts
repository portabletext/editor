import {
  isKeySegment,
  type KeyedSegment,
  type PortableTextObject,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan} from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getFocusTextBlock} from './selectors'

/**
 * @public
 */
export const getNextInlineObject: EditorSelector<
  | {
      node: PortableTextObject
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = ({context}) => {
  const focusTextBlock = getFocusTextBlock({context})
  const selectionEndPoint = getSelectionEndPoint({context})
  const selectionEndPointChildKey =
    selectionEndPoint && isKeySegment(selectionEndPoint.path[2])
      ? selectionEndPoint.path[2]._key
      : undefined

  if (!focusTextBlock || !selectionEndPointChildKey) {
    return undefined
  }

  let endPointChildFound = false
  let inlineObject:
    | {
        node: PortableTextObject
        path: [KeyedSegment, 'children', KeyedSegment]
      }
    | undefined

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpan(context, child) && endPointChildFound) {
      inlineObject = {
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      }
      break
    }
  }

  return inlineObject
}
