import type {EditorSelectionPoint} from '..'
import type {EditorSelector} from '../editor/editor-selector'
import {
  getIndexedSelectionPoint,
  isPointAfter,
} from '../editor/indexed-selection'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'

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

    const endPoint = getIndexedSelectionPoint(
      snapshot.context.schema,
      snapshot.context.value,
      getSelectionEndPoint(snapshot.context.selection),
    )

    if (!endPoint) {
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

    return isPointAfter(indexedPoint, endPoint)
  }
}
