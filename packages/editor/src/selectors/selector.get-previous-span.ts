import type {KeyedSegment, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {getChildKeyFromSelectionPoint} from '../selection/selection-point'
import {getSelectionStartBlock} from './selector.get-selection-start-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getPreviousSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  const selectionStartBlock = getSelectionStartBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)

  if (!selectionStartBlock || !selectionStartPoint) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, selectionStartBlock.node)) {
    return undefined
  }

  const selectionStartPointChildKey =
    getChildKeyFromSelectionPoint(selectionStartPoint)

  let previousSpan:
    | {
        node: PortableTextSpan
        path: [KeyedSegment, 'children', KeyedSegment]
      }
    | undefined

  for (const child of selectionStartBlock.node.children) {
    if (child._key === selectionStartPointChildKey) {
      break
    }

    if (isSpan(snapshot.context, child)) {
      previousSpan = {
        node: child,
        path: [...selectionStartBlock.path, 'children', {_key: child._key}],
      }
    }
  }

  return previousSpan
}
