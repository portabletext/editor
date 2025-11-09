import {isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getChildKeyFromSelectionPoint} from '../utils/util.selection-point'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * @public
 */
export const getNextSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const selectionEndBlock = getSelectionEndBlock(snapshot)
  const selectionEndPoint = getSelectionEndPoint(snapshot)

  if (!selectionEndBlock || !selectionEndPoint) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, selectionEndBlock.node)) {
    return undefined
  }

  const selectionEndPointChildKey =
    getChildKeyFromSelectionPoint(selectionEndPoint)

  let endPointChildFound = false
  let nextSpan:
    | {
        node: PortableTextSpan
        path: ChildPath
      }
    | undefined

  for (const child of selectionEndBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (isSpan(snapshot.context, child) && endPointChildFound) {
      nextSpan = {
        node: child,
        path: [...selectionEndBlock.path, 'children', {_key: child._key}],
      }
      break
    }
  }

  return nextSpan
}
