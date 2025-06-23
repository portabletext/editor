import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelectionPoint} from '../types/editor'
import {getSelectionStartPoint} from '../utils'

/**
 * @public
 */
export function isPointBeforeSelection(
  point: EditorSelectionPoint,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection) {
      return false
    }

    const startPoint = getSelectionStartPoint(snapshot.context.selection)
    const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
    const startChildKey = getChildKeyFromSelectionPoint(startPoint)

    const pointBlockKey = getBlockKeyFromSelectionPoint(point)
    const pointChildKey = getChildKeyFromSelectionPoint(point)

    if (!pointBlockKey || !startBlockKey) {
      return false
    }

    const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
    const pointBlockIndex = snapshot.blockIndexMap.get(pointBlockKey)

    if (startBlockIndex === undefined || pointBlockIndex === undefined) {
      return false
    }

    if (pointBlockIndex < startBlockIndex) {
      // The point block is before the start block.
      return true
    }

    if (pointBlockIndex > startBlockIndex) {
      // The point block is after the start block.
      return false
    }

    // The point block is the same as the start block.
    const pointBlock = snapshot.context.value.at(pointBlockIndex)

    if (!pointBlock) {
      // The point block is not in the value.
      return false
    }

    if (!isTextBlock(snapshot.context, pointBlock)) {
      // The point block is not a text block.
      // Since the point block is the same as the start block, the point is not
      // before the selection.
      return false
    }

    let pointChildIndex: number | undefined
    let startChildIndex: number | undefined

    let childIndex = -1

    // The point block is the same as the start block, so we need to find the
    // child indices and compare them.
    for (const child of pointBlock.children) {
      childIndex++

      if (child._key === pointChildKey && child._key === startChildKey) {
        return point.offset < startPoint.offset
      }

      if (child._key === pointChildKey) {
        pointChildIndex = childIndex
      }

      if (child._key === startChildKey) {
        startChildIndex = childIndex
      }

      if (pointChildIndex !== undefined && startChildIndex !== undefined) {
        break
      }
    }

    if (pointChildIndex === undefined || startChildIndex === undefined) {
      return false
    }

    return pointChildIndex < startChildIndex
  }
}
