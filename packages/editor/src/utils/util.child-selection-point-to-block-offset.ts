import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function childSelectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  let offset = 0

  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)
  const childKey = getChildKeyFromSelectionPoint(selectionPoint)

  if (!blockKey || !childKey) {
    return undefined
  }

  for (const block of context.value) {
    if (block._key !== blockKey) {
      continue
    }

    if (!isTextBlock(context, block)) {
      continue
    }

    for (const child of block.children) {
      if (child._key === childKey) {
        return {
          path: [{_key: block._key}],
          offset: offset + selectionPoint.offset,
        }
      }

      if (isSpan(context, child)) {
        offset += child.text.length
      }
    }
  }
}
