import {type PortableTextObject} from '@sanity/types'
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
      path: [number, number]
    }
  | undefined
> = (snapshot) => {
  const selectionStartPoint = getSelectionStartPoint(snapshot)

  if (!selectionStartPoint) {
    return undefined
  }

  const focusTextBlock = getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: selectionStartPoint,
        focus: selectionStartPoint,
      },
    },
  })

  if (!focusTextBlock) {
    return undefined
  }

  const selectionStartPointChildKey =
    selectionStartPoint.path[1] !== undefined
      ? focusTextBlock.node.children.at(selectionStartPoint.path[1])?._key
      : undefined

  let inlineObject:
    | {
        node: PortableTextObject
        path: [number, number]
      }
    | undefined

  let childIndex = -1
  for (const child of focusTextBlock.node.children) {
    childIndex++

    if (child._key === selectionStartPointChildKey) {
      break
    }

    if (!isSpan(snapshot.context, child)) {
      inlineObject = {
        node: child,
        path: [...focusTextBlock.path, childIndex],
      }
    }
  }

  return inlineObject
}
