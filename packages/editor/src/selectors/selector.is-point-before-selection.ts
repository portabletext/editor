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

    let before = false

    for (const block of snapshot.context.value) {
      if (block._key === pointBlockKey) {
        if (block._key !== startBlockKey) {
          before = true
          break
        }

        // Both the point and the selection start in this block

        if (!isTextBlock(snapshot.context, block)) {
          break
        }

        if (!pointChildKey || !startChildKey) {
          break
        }

        for (const child of block.children) {
          if (child._key === pointChildKey) {
            if (child._key !== startChildKey) {
              before = true
              break
            }

            // Both the point and the selection start in this child

            before = point.offset < startPoint.offset
            break
          }

          if (child._key === startChildKey) {
            break
          }
        }
      }

      if (block._key === startBlockKey) {
        break
      }
    }

    return before
  }
}
