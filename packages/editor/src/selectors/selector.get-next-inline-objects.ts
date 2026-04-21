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

  if (!focusTextBlock || !selectionEndPoint) {
    return []
  }

  const childSegment = selectionEndPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return []
  }

  const children = focusTextBlock.node.children
  const currentIndex = children.findIndex(
    (child) => child._key === childSegment._key,
  )

  if (currentIndex === -1) {
    return []
  }

  const inlineObjects: Array<{
    node: PortableTextObject
    path: Path
  }> = []

  for (let index = currentIndex + 1; index < children.length; index++) {
    const child = children[index]!

    if (!isSpanNode(snapshot.context, child)) {
      inlineObjects.push({
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      })
      break
    }
  }

  return inlineObjects
}
