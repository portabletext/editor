import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EventPosition} from '../internal-utils/event-position'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getFocusInlineObject} from './selector.get-focus-inline-object'
import {getFocusSpan} from './selector.get-focus-span'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectedBlocks} from './selector.get-selected-blocks'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionStartBlock} from './selector.get-selection-start-block'
import {isOverlappingSelection} from './selector.is-overlapping-selection'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'
import {isSelectionExpanded} from './selector.is-selection-expanded'

/**
 * Given the current editor `snapshot` and an `eventSelection` representing
 * where the drag event origins from, this function calculates the selection
 * in the editor that should be dragged.
 */
export function getDragSelection({
  eventSelection,
  snapshot,
}: {
  eventSelection: EventPosition['selection']
  snapshot: EditorSnapshot
}) {
  let dragSelection = eventSelection

  const draggedInlineObject = getFocusInlineObject({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })

  if (draggedInlineObject) {
    return dragSelection
  }

  const draggingCollapsedSelection = isSelectionCollapsed({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const draggedTextBlock = getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const draggedSpan = getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })

  if (draggingCollapsedSelection && draggedTextBlock && draggedSpan) {
    // Looks like we are dragging an empty span
    // Let's drag the entire block instead
    dragSelection = {
      anchor: getBlockStartPoint({
        context: snapshot.context,
        block: draggedTextBlock,
      }),
      focus: getBlockEndPoint({
        context: snapshot.context,
        block: draggedTextBlock,
      }),
    }
  }

  const selectedBlocks = getSelectedBlocks(snapshot)

  if (
    snapshot.context.selection &&
    isSelectionExpanded(snapshot) &&
    selectedBlocks.length > 1
  ) {
    const selectionStartBlock = getSelectionStartBlock(snapshot)
    const selectionEndBlock = getSelectionEndBlock(snapshot)

    if (!selectionStartBlock || !selectionEndBlock) {
      return dragSelection
    }

    const selectionStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock,
    })
    const selectionEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock,
    })

    const eventSelectionInsideBlocks = isOverlappingSelection(eventSelection)({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {anchor: selectionStartPoint, focus: selectionEndPoint},
      },
    })

    if (eventSelectionInsideBlocks) {
      dragSelection = {
        anchor: selectionStartPoint,
        focus: selectionEndPoint,
      }
    }
  }

  return dragSelection
}
