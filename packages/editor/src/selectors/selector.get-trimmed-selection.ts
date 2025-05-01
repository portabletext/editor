import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'
import {isEmptyTextBlock, isKeyedSegment} from '../utils'
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

  const startBlockKey = isKeyedSegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : null
  const startChildKey = isKeyedSegment(startPoint.path[2])
    ? startPoint.path[2]._key
    : null
  const endBlockKey = isKeyedSegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : null
  const endChildKey = isKeyedSegment(endPoint.path[2])
    ? endPoint.path[2]._key
    : null

  if (!startBlockKey || !endBlockKey) {
    return snapshot.context.selection
  }

  let startBlockFound = false
  let adjustedStartPoint: EditorSelectionPoint | undefined
  let trimStartPoint = false
  let adjustedEndPoint: EditorSelectionPoint | undefined
  let trimEndPoint = false
  let previousPotentialEndpoint:
    | {blockKey: string; span: PortableTextSpan}
    | undefined

  for (const block of snapshot.context.value) {
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
