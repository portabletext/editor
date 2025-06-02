import {
  getIndexedSelectionPoint,
  isPointBefore,
} from '../editor/editor-selection'
import type {EditorSelectionPoint} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

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

    const startPoint = getIndexedSelectionPoint(
      snapshot.context.schema,
      snapshot.context.value,
      getSelectionStartPoint(snapshot.context.selection),
    )

    if (!startPoint) {
      return false
    }

    const indexedPoint = getIndexedSelectionPoint(
      snapshot.context.schema,
      snapshot.context.value,
      point,
    )

    if (!indexedPoint) {
      return false
    }

    return isPointBefore(indexedPoint, startPoint)
  }
}
