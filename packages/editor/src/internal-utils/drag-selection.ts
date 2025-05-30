import type {EditorSnapshot} from '..'
import * as selectors from '../selectors'
import * as utils from '../utils'
import type {EventPosition} from './event-position'

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

  const draggedInlineObject = selectors.getFocusInlineObject({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })

  if (draggedInlineObject) {
    return dragSelection
  }

  const draggingCollapsedSelection = selectors.isSelectionCollapsed({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const draggedTextBlock = selectors.getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const draggedTextBlockIndex = draggedTextBlock
    ? eventSelection.focus.path.at(0)
    : undefined
  const draggedSpan = selectors.getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })

  if (
    draggingCollapsedSelection &&
    draggedTextBlock &&
    draggedSpan &&
    draggedTextBlockIndex !== undefined
  ) {
    // Looks like we are dragging an empty span
    // Let's drag the entire block instead
    dragSelection = {
      anchor: utils.getBlockStartPoint({
        context: snapshot.context,
        block: draggedTextBlock,
      }),
      focus: utils.getBlockEndPoint({
        context: snapshot.context,
        block: draggedTextBlock,
      }),
    }
  }

  const selectedBlocks = selectors.getSelectedBlocks(snapshot)

  if (
    snapshot.context.selection &&
    selectors.isSelectionExpanded(snapshot) &&
    selectedBlocks.length > 1
  ) {
    const startPoint = utils.getSelectionStartPoint(snapshot.context.selection)
    const endPoint = utils.getSelectionEndPoint(snapshot.context.selection)

    if (!startPoint || !endPoint) {
      return dragSelection
    }

    const selectionStartBlock = selectors.getSelectionStartBlock(snapshot)
    const startBlockIndex = startPoint.path.at(0)
    const selectionEndBlock = selectors.getSelectionEndBlock(snapshot)
    const endBlockIndex = endPoint.path.at(0)

    if (
      !selectionStartBlock ||
      startBlockIndex === undefined ||
      !selectionEndBlock ||
      endBlockIndex === undefined
    ) {
      return dragSelection
    }

    const selectionStartPoint = utils.getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock,
    })
    const selectionEndPoint = utils.getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock,
    })

    const eventSelectionInsideBlocks = selectors.isOverlappingSelection(
      eventSelection,
    )({
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
