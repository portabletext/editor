import type {EditorSelectionPoint} from '../editor/editor-selection'
import {getIndexedSelectionPoint} from '../editor/editor-selection'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {BlockOffset} from '../types/block-offset'

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

  const indexedSelectionPoint = getIndexedSelectionPoint(
    context.schema,
    context.value,
    selectionPoint,
  )

  if (!indexedSelectionPoint) {
    return undefined
  }

  const blockIndex = indexedSelectionPoint.path.at(0)
  const childIndex = indexedSelectionPoint.path.at(1)

  if (blockIndex === undefined || childIndex === undefined) {
    return undefined
  }

  const block = context.value.at(blockIndex)

  if (!block) {
    return undefined
  }

  if (!isTextBlock(context, block)) {
    return {
      path: [{_key: block._key}],
      offset: indexedSelectionPoint.offset,
    }
  }

  let childCursor = -1

  for (const child of block.children) {
    childCursor++

    if (childCursor === childIndex) {
      return {
        path: [{_key: block._key}],
        offset: offset + indexedSelectionPoint.offset,
      }
    }

    if (isSpan(context, child)) {
      offset += child.text.length
    }
  }
}
