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

    let after = false

    for (const block of snapshot.context.value) {
      if (block._key === endBlockKey) {
        if (block._key !== pointBlockKey) {
          after = true
          break
        }

        // Both the point and the selection end in this block

        if (!isTextBlock(snapshot.context, block)) {
          break
        }

        if (!pointChildKey || !endChildKey) {
          break
        }

        for (const child of block.children) {
          if (child._key === endChildKey) {
            if (child._key !== pointChildKey) {
              after = true
              break
            }

            // Both the point and the selection end in this child

            after = point.offset > endPoint.offset
            break
          }

          if (child._key === pointChildKey) {
            break
          }
        }
      }

      if (block._key === pointBlockKey) {
        break
      }
    }

    return after
  }
}
