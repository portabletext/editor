import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * Returns the span after the selection end within the same text block,
 * resolved at any depth.
 *
 * @public
 */
export const getNextSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: Path
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

  const childSegment = selectionEndPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const children = selectionEndBlock.node.children
  const currentIndex = children.findIndex(
    (child) => child._key === childSegment._key,
  )

  if (currentIndex === -1) {
    return undefined
  }

  for (let index = currentIndex + 1; index < children.length; index++) {
    const child = children[index]!

    if (isSpan(snapshot.context, child)) {
      return {
        node: child,
        path: [...selectionEndBlock.path, 'children', {_key: child._key}],
      }
    }
  }

  return undefined
}
