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
  const selectionEndPointChildKey = isKeyedSegment(childSegment)
    ? childSegment._key
    : undefined

  let endPointChildFound = false
  let nextSpan:
    | {
        node: PortableTextSpan
        path: Path
      }
    | undefined

  for (const child of selectionEndBlock.node.children) {
    if (child._key === selectionEndPointChildKey) {
      endPointChildFound = true
      continue
    }

    if (isSpan(snapshot.context, child) && endPointChildFound) {
      nextSpan = {
        node: child,
        path: [...selectionEndBlock.path, 'children', {_key: child._key}],
      }
      break
    }
  }

  return nextSpan
}
