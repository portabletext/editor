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
  return ({context}) => {
    if (!selection || !context.selection) {
      return false
    }

    const selectionStartPoint = getSelectionStartPoint({
      context: {
        ...context,
        selection,
      },
    })
    const selectionEndPoint = getSelectionEndPoint({
      context: {
        ...context,
        selection,
      },
    })

    if (!selectionStartPoint || !selectionEndPoint) {
      return false
    }

    if (!isPointAfterSelection(selectionStartPoint)({context})) {
      return false
    }

    if (!isPointBeforeSelection(selectionEndPoint)({context})) {
      return false
    }

    return true
  }
}
