import {isSpan} from '@portabletext/schema'
import {isKeySegment, type PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getPreviousInlineObjects: EditorSelector<
  Array<{
    node: PortableTextObject
    path: ChildPath
  }>
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const selectionStartPointChildKey =
    selectionStartPoint && isKeySegment(selectionStartPoint.path[2])
      ? selectionStartPoint.path[2]._key
      : undefined

  if (!focusTextBlock || !selectionStartPointChildKey) {
    return []
  }

  const inlineObjects: Array<{
    node: PortableTextObject
    path: ChildPath
  }> = []

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionStartPointChildKey) {
      break
    }

    if (!isSpan(snapshot.context, child)) {
      inlineObjects.push({
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      })
    }
  }

  return inlineObjects
}
