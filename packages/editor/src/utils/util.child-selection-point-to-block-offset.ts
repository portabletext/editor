import {isSpan, isTextBlock} from '@portabletext/schema'
import {getParent} from '../traversal/get-parent'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function childSelectionPointToBlockOffset({
  snapshot,
  selectionPoint,
}: {
  snapshot: TraversalSnapshot
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const childSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const textBlock = getParent(snapshot, selectionPoint.path, {
    match: (node) => isTextBlock({schema: snapshot.context.schema}, node),
  })

  if (!textBlock) {
    return undefined
  }

  let offset = 0

  for (const child of textBlock.node.children) {
    if (child._key === childSegment._key) {
      return {
        path: textBlock.path,
        offset: offset + selectionPoint.offset,
      }
    }

    if (isSpan(snapshot.context, child)) {
      offset += child.text.length
    }
  }

  return undefined
}
