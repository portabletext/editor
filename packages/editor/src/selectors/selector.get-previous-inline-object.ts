import {isSpan, type PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

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
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const selectionStartPointChildKey =
    selectionStartPoint && isKeyedSegment(selectionStartPoint.path[2])
      ? selectionStartPoint.path[2]._key
      : undefined

  if (!focusTextBlock || !selectionStartPointChildKey) {
    return undefined
  }

  let inlineObject:
    | {
        node: PortableTextObject
        path: ChildPath
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
