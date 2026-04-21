import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getSelectionStartBlock} from './selector.get-selection-start-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns the span before the selection start within the same text block,
 * resolved at any depth.
 *
 * @public
 */
export const getPreviousSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: Path
    }
  | undefined
> = (snapshot) => {
  const selectionStartBlock = getSelectionStartBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)

  if (!selectionStartBlock || !selectionStartPoint) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, selectionStartBlock.node)) {
    return undefined
  }

  const childSegment = selectionStartPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const children = selectionStartBlock.node.children
  const currentIndex = children.findIndex(
    (child) => child._key === childSegment._key,
  )

  if (currentIndex <= 0) {
    return undefined
  }

  let previousSpan:
    | {
        node: PortableTextSpan
        path: Path
      }
    | undefined

  for (let index = 0; index < currentIndex; index++) {
    const child = children[index]!

    if (isSpan(snapshot.context, child)) {
      previousSpan = {
        node: child,
        path: [...selectionStartBlock.path, 'children', {_key: child._key}],
      }
    }
  }

  return previousSpan
}
