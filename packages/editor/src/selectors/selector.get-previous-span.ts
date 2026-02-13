import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getChildKeyFromSelectionPoint} from '../utils/util.selection-point'
import {getSelectionStartBlock} from './selector.get-selection-start-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getPreviousSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: ChildPath
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
        path: ChildPath
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
