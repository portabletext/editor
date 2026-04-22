import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpanNode} from '../slate/node/is-span-node'
import type {ChildPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns the inline object before the selection start within the same text
 * block, resolved at any depth.
 *
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

  if (!focusTextBlock || !selectionStartPoint) {
    return undefined
  }

  const childSegment = selectionStartPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const children = focusTextBlock.node.children
  const currentIndex = children.findIndex(
    (child) => child._key === childSegment._key,
  )

  if (currentIndex <= 0) {
    return undefined
  }

  let previousInlineObject:
    | {
        node: PortableTextObject
        path: ChildPath
      }
    | undefined

  for (let index = 0; index < currentIndex; index++) {
    const child = children[index]!

    if (!isSpanNode(snapshot.context, child)) {
      previousInlineObject = {
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      }
    }
  }

  return previousInlineObject
}
