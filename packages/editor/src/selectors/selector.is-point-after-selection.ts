import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelectionPoint} from '../types/editor'
import {getSelectionEndPoint} from '../utils'

/**
 * @public
 */
export function isPointAfterSelection(
  point: EditorSelectionPoint,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection) {
      return false
    }

    const endPoint = getSelectionEndPoint(snapshot.context.selection)
    const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
    const endChildKey = getChildKeyFromSelectionPoint(endPoint)

    const pointBlockKey = getBlockKeyFromSelectionPoint(point)
    const pointChildKey = getChildKeyFromSelectionPoint(point)

    if (!pointBlockKey || !endBlockKey) {
      return false
    }

    const pointBlockIndex = snapshot.blockIndexMap.get(pointBlockKey)
    const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

    if (pointBlockIndex === undefined || endBlockIndex === undefined) {
      return false
    }

    if (pointBlockIndex > endBlockIndex) {
      // The point block is after the end block.
      return true
    }

    if (pointBlockIndex < endBlockIndex) {
      // The point block is before the end block.
      return false
    }

    // The point block is the same as the end block.
    const pointBlock = snapshot.context.value.at(pointBlockIndex)

    if (!pointBlock) {
      // The point block is not in the value.
      return false
    }

    if (!isTextBlock(snapshot.context, pointBlock)) {
      // The point block is not a text block.
      // Since the point block is the same as the end block, the point is not
      // after the selection.
      return false
    }

    let pointChildIndex: number | undefined
    let endChildIndex: number | undefined

    let childIndex = -1

    // The point block is the same as the end block, so we need to find the
    // child indices and compare them.
    for (const child of pointBlock.children) {
      childIndex++

      if (child._key === pointChildKey && child._key === endChildKey) {
        return point.offset > endPoint.offset
      }

      if (child._key === pointChildKey) {
        pointChildIndex = childIndex
      }

      if (child._key === endChildKey) {
        endChildIndex = childIndex
      }

      if (pointChildIndex !== undefined && endChildIndex !== undefined) {
        break
      }
    }

    if (pointChildIndex === undefined || endChildIndex === undefined) {
      return false
    }

    return pointChildIndex > endChildIndex
  }
}
