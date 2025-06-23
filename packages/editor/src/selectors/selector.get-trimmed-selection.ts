import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {
  getSelectionEndPoint,
  getSelectionStartPoint,
  isEmptyTextBlock,
} from '../utils'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export const getTrimmedSelection: EditorSelector<EditorSelection> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return snapshot.context.selection
  }

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
  const startChildKey = getChildKeyFromSelectionPoint(startPoint)
  const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
  const endChildKey = getChildKeyFromSelectionPoint(endPoint)

  if (!startBlockKey || !endBlockKey) {
    return snapshot.context.selection
  }

  const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
  const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

  if (startBlockIndex === undefined || endBlockIndex === undefined) {
    return snapshot.context.selection
  }

  const slicedValue = snapshot.context.value.slice(
    startBlockIndex,
    endBlockIndex + 1,
  )

  let startBlockFound = false
  let adjustedStartPoint: EditorSelectionPoint | undefined
  let trimStartPoint = false
  let adjustedEndPoint: EditorSelectionPoint | undefined
  let trimEndPoint = false
  let previousPotentialEndpoint:
    | {blockKey: string; span: PortableTextSpan}
    | undefined

  for (const block of slicedValue) {
    if (block._key === startBlockKey) {
      startBlockFound = true

      if (
        isTextBlock(snapshot.context, block) &&
        isEmptyTextBlock(snapshot.context, block)
      ) {
        continue
      }
    }

    if (!startBlockFound) {
      continue
    }

    if (!isTextBlock(snapshot.context, block)) {
      continue
    }

    if (
      block._key === endBlockKey &&
      isEmptyTextBlock(snapshot.context, block)
    ) {
      break
    }

    for (const child of block.children) {
      if (child._key === endChildKey) {
        if (!isSpan(snapshot.context, child) || endPoint.offset === 0) {
          adjustedEndPoint = previousPotentialEndpoint
            ? {
                path: [
                  {_key: previousPotentialEndpoint.blockKey},
                  'children',
                  {_key: previousPotentialEndpoint.span._key},
                ],
                offset: previousPotentialEndpoint.span.text.length,
              }
            : undefined

          trimEndPoint = true
          break
        }
      }

      if (trimStartPoint) {
        const lonelySpan =
          isSpan(snapshot.context, child) && block.children.length === 1

        if (
          (isSpan(snapshot.context, child) && child.text.length > 0) ||
          lonelySpan
        ) {
          adjustedStartPoint = {
            path: [{_key: block._key}, 'children', {_key: child._key}],
            offset: 0,
          }
          previousPotentialEndpoint = {blockKey: block._key, span: child}
          trimStartPoint = false
        }

        continue
      }

      if (child._key === startChildKey) {
        if (!isSpan(snapshot.context, child)) {
          trimStartPoint = true
          continue
        }

        if (startPoint.offset === child.text.length) {
          trimStartPoint = true
          previousPotentialEndpoint =
            child.text.length > 0
              ? {blockKey: block._key, span: child}
              : previousPotentialEndpoint
          continue
        }
      }

      previousPotentialEndpoint =
        isSpan(snapshot.context, child) && child.text.length > 0
          ? {blockKey: block._key, span: child}
          : previousPotentialEndpoint
    }

    if (block._key === endBlockKey) {
      break
    }
  }

  const trimmedSelection = snapshot.context.selection.backward
    ? {
        anchor: trimEndPoint && adjustedEndPoint ? adjustedEndPoint : endPoint,
        focus: adjustedStartPoint ?? startPoint,
        backward: true,
      }
    : {
        anchor: adjustedStartPoint ?? startPoint,
        focus: trimEndPoint && adjustedEndPoint ? adjustedEndPoint : endPoint,
      }

  if (
    isSelectionCollapsed({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: trimmedSelection,
      },
    })
  ) {
    const focusTextBlock = getFocusTextBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: trimmedSelection,
      },
    })

    if (
      focusTextBlock &&
      !isEmptyTextBlock(snapshot.context, focusTextBlock.node)
    ) {
      return null
    }
  }

  return trimmedSelection
}
