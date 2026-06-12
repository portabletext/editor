import type {EditorSelection, EditorSnapshot} from '@portabletext/editor'
import {
  getFocusInlineObject,
  getFocusSpan,
  getFocusTextBlock,
  getFragment,
  getSelectionEndBlock,
  getSelectionStartBlock,
  isOverlappingSelection,
  isSelectionCollapsed,
  isSelectionExpanded,
} from '@portabletext/editor/selectors'
import {getBlockEndPoint, getBlockStartPoint} from '@portabletext/editor/utils'

/**
 * Given the current editor `snapshot` and an `eventSelection` representing
 * where the drag event originates from, calculate the selection in the
 * editor that should be dragged.
 *
 * Duplicated from the editor's internal `getDragSelection` rather than
 * imported: exporting it from core would add permanent public API for what
 * is an implementation detail of this plugin. Built on public selectors
 * only. Keep in sync with
 * `packages/editor/src/selectors/drag-selection.ts`.
 */
export function getDragSelection({
  eventSelection,
  snapshot,
}: {
  eventSelection: NonNullable<EditorSelection>
  snapshot: EditorSnapshot
}): NonNullable<EditorSelection> {
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

  const selectedBlocks = getFragment(snapshot)

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
