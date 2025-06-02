import type {EditorSelectionPoint} from '../editor/editor-selection'
import {getIndexedSelectionPoint} from '../editor/editor-selection'
import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {BlockOffset} from '../types/block-offset'
import {isKeyedBlockPath} from '../types/paths'

/**
 * @public
 */
export function blockOffsetToSpanSelectionPoint({
  context,
  blockOffset,
  direction,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}): EditorSelectionPoint | undefined {
  let offsetLeft = blockOffset.offset
  let selectionPoint: {path: [number, number]; offset: number} | undefined
  let skippedInlineObject = false

  let blockIndex = -1

  for (const block of context.value) {
    blockIndex++

    if (isKeyedBlockPath(blockOffset.path)) {
      if (block._key !== blockOffset.path[0]._key) {
        continue
      }
    } else {
      if (blockIndex !== blockOffset.path[0]) {
        continue
      }
    }

    if (!isTextBlock(context, block)) {
      continue
    }

    let childIndex = -1

    for (const child of block.children) {
      childIndex++

      if (direction === 'forward') {
        if (!isSpan(context, child)) {
          continue
        }

        if (offsetLeft <= child.text.length) {
          selectionPoint = {
            path: [blockIndex, childIndex],
            offset: offsetLeft,
          }
          break
        }

        offsetLeft -= child.text.length

        continue
      }

      if (!isSpan(context, child)) {
        skippedInlineObject = true
        continue
      }

      if (offsetLeft === 0 && selectionPoint && !skippedInlineObject) {
        if (skippedInlineObject) {
          selectionPoint = {
            path: [blockIndex, childIndex],
            offset: 0,
          }
        }
        break
      }

      if (offsetLeft > child.text.length) {
        offsetLeft -= child.text.length
        continue
      }

      if (offsetLeft <= child.text.length) {
        selectionPoint = {
          path: [blockIndex, childIndex],
          offset: offsetLeft,
        }

        offsetLeft -= child.text.length

        if (offsetLeft !== 0) {
          break
        }
      }
    }
  }

  return selectionPoint
}

/**
 * @public
 */
export function spanSelectionPointToBlockOffset({
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

  if (!isTextBlock(context, block)) {
    return undefined
  }

  let childCursor = -1

  for (const child of block.children) {
    childCursor++

    if (!isSpan(context, child)) {
      continue
    }

    if (childCursor === childIndex) {
      return {
        path: [blockIndex],
        offset: offset + selectionPoint.offset,
      }
    }

    offset += child.text.length
  }
}
