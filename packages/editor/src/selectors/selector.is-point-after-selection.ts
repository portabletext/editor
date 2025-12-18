import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../types/editor'
import {comparePoints} from '../utils/util.compare-points'
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

    const endPoint = getSelectionEndPoint(snapshot.context.selection)

    return comparePoints(snapshot, point, endPoint) === 1
  }
}
