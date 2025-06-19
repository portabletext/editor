import {isKeySegment, type PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {isSpan} from '../utils'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

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
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionEndPoint = getSelectionEndPoint(snapshot)
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
        path: ChildPath
      }
    | undefined

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpan(snapshot.context, child) && endPointChildFound) {
      inlineObject = {
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      }
      break
    }
  }

  return inlineObject
}
