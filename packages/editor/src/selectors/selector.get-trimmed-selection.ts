import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  EditorSelection,
  EditorSelectionPoint,
  isBackward,
} from '../types/selection'
import {isEmptyTextBlock} from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'
import {getFocusTextBlock} from './selectors'

/**
 * @public
 */
export const getTrimmedSelection: EditorSelector<EditorSelection> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return snapshot.context.selection
  }

  const startPoint = getSelectionStartPoint(snapshot)
  const endPoint = getSelectionEndPoint(snapshot)

  if (!startPoint || !endPoint) {
    return snapshot.context.selection
  }

  const startBlock =
    startPoint.path[0] !== undefined
      ? snapshot.context.value.at(startPoint.path[0])
      : undefined
  const startChildKey =
    startPoint.path[1] !== undefined &&
    isTextBlock(snapshot.context, startBlock)
      ? startBlock?.children.at(startPoint.path[1])?._key
      : undefined
  const endBlock =
    endPoint.path[0] !== undefined
      ? snapshot.context.value.at(endPoint.path[0])
      : undefined
  const endChildKey =
    endPoint.path[1] !== undefined && isTextBlock(snapshot.context, endBlock)
      ? endBlock?.children.at(endPoint.path[1])?._key
      : undefined

  if (!startBlock || !endBlock) {
    return snapshot.context.selection
  }

  let startBlockFound = false
  let adjustedStartPoint: EditorSelectionPoint | undefined
  let trimStartPoint = false
  let adjustedEndPoint: EditorSelectionPoint | undefined
  let trimEndPoint = false
  let previousPotentialEndpoint: EditorSelectionPoint | undefined

  let blockIndex = 0

  for (const block of snapshot.context.value) {
    blockIndex++

    if (block._key === startBlock._key) {
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
      block._key === endBlock._key &&
      isEmptyTextBlock(snapshot.context, block)
    ) {
      break
    }

    let childIndex = 0

    for (const child of block.children) {
      childIndex++

      if (child._key === endChildKey) {
        if (!isSpan(snapshot.context, child) || endPoint.offset === 0) {
          adjustedEndPoint = previousPotentialEndpoint
            ? previousPotentialEndpoint
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
            path: [blockIndex, childIndex],
            offset: 0,
          }
          previousPotentialEndpoint = {
            path: [blockIndex, childIndex],
            offset: child.text.length,
          }
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
              ? {
                  path: [blockIndex, childIndex],
                  offset: child.text.length,
                }
              : previousPotentialEndpoint
          continue
        }
      }

      previousPotentialEndpoint =
        isSpan(snapshot.context, child) && child.text.length > 0
          ? {
              path: [blockIndex, childIndex],
              offset: child.text.length,
            }
          : previousPotentialEndpoint
    }

    if (block._key === endBlock._key) {
      break
    }
  }

  const trimmedSelection = isBackward(snapshot.context.selection)
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
