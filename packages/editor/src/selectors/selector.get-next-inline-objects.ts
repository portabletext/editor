import {isSpan} from '@portabletext/schema'
import {isKeySegment, type PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * @public
 */
export const getNextInlineObjects: EditorSelector<
  Array<{
    node: PortableTextObject
    path: ChildPath
  }>
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionEndPoint = getSelectionEndPoint(snapshot)
  const selectionEndPointChildKey =
    selectionEndPoint && isKeySegment(selectionEndPoint.path[2])
      ? selectionEndPoint.path[2]._key
      : undefined

  if (!focusTextBlock || !selectionEndPointChildKey) {
    return []
  }

  let endPointChildFound = false
  const inlineObjects: Array<{
    node: PortableTextObject
    path: ChildPath
  }> = []

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpan(snapshot.context, child) && endPointChildFound) {
      inlineObjects.push({
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      })
      break
    }
  }

  return inlineObjects
}
