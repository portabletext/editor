import {type PortableTextObject} from '@sanity/types'
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
      path: [number, number]
    }
  | undefined
> = (snapshot) => {
  const selectionEndPoint = getSelectionEndPoint(snapshot)

  if (!selectionEndPoint) {
    return undefined
  }

  const focusTextBlock = getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: selectionEndPoint,
        focus: selectionEndPoint,
      },
    },
  })

  if (!focusTextBlock) {
    return undefined
  }

  const selectionEndPointChildKey =
    selectionEndPoint.path[1] !== undefined
      ? focusTextBlock.node.children.at(selectionEndPoint.path[1])?._key
      : undefined

  if (!focusTextBlock || !selectionEndPointChildKey) {
    return undefined
  }

  let endPointChildFound = false
  let inlineObject:
    | {
        node: PortableTextObject
        path: [number, number]
      }
    | undefined

  let childIndex = -1
  for (const child of focusTextBlock.node.children) {
    childIndex++

    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpan(snapshot.context, child) && endPointChildFound) {
      inlineObject = {
        node: child,
        path: [...focusTextBlock.path, childIndex],
      }
      break
    }
  }

  return inlineObject
}
