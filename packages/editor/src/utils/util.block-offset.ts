import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {ChildPath} from '../types/paths'

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
}) {
  let offsetLeft = blockOffset.offset
  let selectionPoint: {path: ChildPath; offset: number} | undefined
  let skippedInlineObject = false

  for (const block of context.value) {
    if (block._key !== blockOffset.path[0]._key) {
      continue
    }

    if (!isTextBlock(context, block)) {
      continue
    }

    for (const child of block.children) {
      if (direction === 'forward') {
        if (!isSpan(context, child)) {
          continue
        }

        if (offsetLeft <= child.text.length) {
          selectionPoint = {
            path: [...blockOffset.path, 'children', {_key: child._key}],
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
            path: [...blockOffset.path, 'children', {_key: child._key}],
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
          path: [...blockOffset.path, 'children', {_key: child._key}],
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

  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)
  const spanKey = getChildKeyFromSelectionPoint(selectionPoint)

  if (!blockKey || !spanKey) {
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
      if (!isSpan(context, child)) {
        continue
      }

      if (child._key === spanKey) {
        return {
          path: [{_key: block._key}],
          offset: offset + selectionPoint.offset,
        }
      }

      offset += child.text.length
    }
  }
}
