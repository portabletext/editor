import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isSpanNode} from '../slate/node/is-span-node'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns the inline objects before the selection start within the same
 * text block, resolved at any depth.
 *
 * @public
 */
export const getPreviousInlineObjects: EditorSelector<
  Array<{
    node: PortableTextObject
    path: Path
  }>
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const childSegment = selectionStartPoint?.path.at(-1)
  const selectionStartPointChildKey = isKeyedSegment(childSegment)
    ? childSegment._key
    : undefined

  if (!focusTextBlock || !selectionStartPointChildKey) {
    return []
  }

  const inlineObjects: Array<{
    node: PortableTextObject
    path: Path
  }> = []

  for (const child of focusTextBlock.node.children) {
    if (child._key === selectionStartPointChildKey) {
      break
    }

    if (!isSpanNode(snapshot.context, child)) {
      inlineObjects.push({
        node: child,
        path: [...focusTextBlock.path, 'children', {_key: child._key}],
      })
    }
  }

  return inlineObjects
}
