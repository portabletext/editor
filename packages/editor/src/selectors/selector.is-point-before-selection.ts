import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {EditorSelectionPoint} from '../types/selection'
import {isBackward, isPointBefore} from '../types/selection'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {reverseSelection} from '../utils/util.reverse-selection'

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

    const selection = isBackward(snapshot.context.selection)
      ? reverseSelection(snapshot.context.selection)
      : snapshot.context.selection

    return isPointBefore(point, selection.anchor)
  }
}
