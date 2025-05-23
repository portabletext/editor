import {EditorSelection, selectionIncludesSelection} from '../types/selection'
import {isEqualSelectionPoints} from '../utils'
import type {EditorSelector} from './../editor/editor-selector'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {isPointAfterSelection} from './selector.is-point-after-selection'
import {isPointBeforeSelection} from './selector.is-point-before-selection'

/**
 * @public
 */
export function isOverlappingSelection(
  selection: EditorSelection | null,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!selection || !snapshot.context.selection) {
      return false
    }

    return selectionIncludesSelection(snapshot.context.selection, selection)
  }
}
