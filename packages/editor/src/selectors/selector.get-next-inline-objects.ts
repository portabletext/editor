import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isSpanNode} from '../slate/node/is-span-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * Returns the inline objects after the selection end within the same text
 * block, resolved at any depth.
 *
 * @public
 */
export const getNextInlineObjects: EditorSelector<
  Array<{
    node: PortableTextObject
    path: Path
  }>
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionEndPoint = getSelectionEndPoint(snapshot)
  const childSegment = selectionEndPoint?.path.at(-1)
  const selectionEndPointChildKey = isKeyedSegment(childSegment)
    ? childSegment._key
    : undefined

  if (!focusTextBlock || !selectionEndPointChildKey) {
    return []
  }

  let endPointChildFound = false
  const inlineObjects: Array<{
    node: PortableTextObject
    path: Path
  }> = []

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (!isSpanNode(snapshot.context, child) && endPointChildFound) {
      inlineObjects.push({
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      })
      break
    }
  }

  return inlineObjects
}
