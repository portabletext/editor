import type {EditorSelection} from '../types/editor'
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

    const originalSelectionStartPoint = getSelectionStartPoint(snapshot)
    const originalSelectionEndPoint = getSelectionEndPoint(snapshot)

    if (
      !selectionStartPoint ||
      !selectionEndPoint ||
      !originalSelectionStartPoint ||
      !originalSelectionEndPoint
    ) {
      return false
    }

    const startPointBeforeSelection =
      isPointBeforeSelection(selectionStartPoint)(snapshot)
    const startPointAfterSelection =
      isPointAfterSelection(selectionStartPoint)(snapshot)
    const endPointBeforeSelection =
      isPointBeforeSelection(selectionEndPoint)(snapshot)
    const endPointAfterSelection =
      isPointAfterSelection(selectionEndPoint)(snapshot)

    const originalStartPointBeforeStartPoint = isPointBeforeSelection(
      originalSelectionStartPoint,
    )({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: selectionStartPoint,
          focus: selectionStartPoint,
        },
      },
    })
    const originalStartPointAfterStartPoint = isPointAfterSelection(
      originalSelectionStartPoint,
    )({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: selectionStartPoint,
          focus: selectionStartPoint,
        },
      },
    })

    const originalEndPointBeforeEndPoint = isPointBeforeSelection(
      originalSelectionEndPoint,
    )({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: selectionEndPoint,
          focus: selectionEndPoint,
        },
      },
    })
    const originalEndPointAfterEndPoint = isPointAfterSelection(
      originalSelectionEndPoint,
    )({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: selectionEndPoint,
          focus: selectionEndPoint,
        },
      },
    })

    const endPointEqualToOriginalStartPoint = isEqualSelectionPoints(
      selectionEndPoint,
      originalSelectionStartPoint,
    )
    const startPointEqualToOriginalEndPoint = isEqualSelectionPoints(
      selectionStartPoint,
      originalSelectionEndPoint,
    )

    if (endPointBeforeSelection && !endPointEqualToOriginalStartPoint) {
      return false
    }

    if (startPointAfterSelection && !startPointEqualToOriginalEndPoint) {
      return false
    }

    if (
      !originalStartPointBeforeStartPoint &&
      originalStartPointAfterStartPoint &&
      !originalEndPointBeforeEndPoint &&
      originalEndPointAfterEndPoint
    ) {
      return !endPointEqualToOriginalStartPoint
    }

    if (
      originalStartPointBeforeStartPoint &&
      !originalStartPointAfterStartPoint &&
      originalEndPointBeforeEndPoint &&
      !originalEndPointAfterEndPoint
    ) {
      return !startPointEqualToOriginalEndPoint
    }

    if (
      !startPointAfterSelection ||
      !startPointBeforeSelection ||
      !endPointAfterSelection ||
      !endPointBeforeSelection
    ) {
      return true
    }

    return false
  }
}
