import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelectionPoint} from '../types/editor'
import {comparePoints} from '../utils/util.compare-points'
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

    const startPoint = getSelectionStartPoint(snapshot.context.selection)

    return comparePoints(snapshot, point, startPoint) === -1
  }
}
