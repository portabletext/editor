import {isSpan} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function childSelectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const childSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(childSegment)) {
    return undefined
  }

  const textBlock = getAncestorTextBlock(context, selectionPoint.path)

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

    if (isSpan(context, child)) {
      offset += child.text.length
    }
  }

  return undefined
}
