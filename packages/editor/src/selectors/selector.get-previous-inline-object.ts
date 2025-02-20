import {
  isKeySegment,
  type KeyedSegment,
  type PortableTextObject,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan} from '../utils'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {getFocusTextBlock} from './selectors'

/**
 * @public
 */
export const getPreviousInlineObject: EditorSelector<
  | {
      node: PortableTextObject
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const selectionStartPointChildKey =
    selectionStartPoint && isKeySegment(selectionStartPoint.path[2])
      ? selectionStartPoint.path[2]._key
      : undefined

  if (!focusTextBlock || !selectionStartPointChildKey) {
    return undefined
  }

  let inlineObject:
    | {
        node: PortableTextObject
        path: [KeyedSegment, 'children', KeyedSegment]
      }
    | undefined

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionStartPointChildKey) {
      break
    }

    if (!isSpan(snapshot.context, child)) {
      inlineObject = {
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      }
    }
  }

  return inlineObject
}
