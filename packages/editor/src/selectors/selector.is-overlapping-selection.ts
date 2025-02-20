import type {EditorSelection} from '../types/editor'
import type {EditorSelector} from './../editor/editor-selector'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {isPointAfterSelection} from './selector.is-point-after-selection'
import {isPointBeforeSelection} from './selector.is-point-before-selection'

/**
 * @public
 */
export function isOverlappingSelection(
  selection: EditorSelection,
): EditorSelector<boolean> {
  return (snapshot) => {
    if (!selection || !snapshot.context.selection) {
      return false
    }

    const selectionStartPoint = getSelectionStartPoint({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })
    const selectionEndPoint = getSelectionEndPoint({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })

    if (!selectionStartPoint || !selectionEndPoint) {
      return false
    }

    if (!isPointAfterSelection(selectionStartPoint)(snapshot)) {
      return false
    }

    if (!isPointBeforeSelection(selectionEndPoint)(snapshot)) {
      return false
    }

    return true
  }
}
