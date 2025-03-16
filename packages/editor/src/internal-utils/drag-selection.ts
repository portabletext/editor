import type {EditorSnapshot} from '..'
import * as selectors from '../selectors'
import * as utils from '../utils'
import type {EventPosition} from './event-position'

export function getDragSelection({
  eventSelection,
  snapshot,
}: {
  eventSelection: EventPosition['selection']
  snapshot: EditorSnapshot
}) {
  let dragSelection = eventSelection

  const collapsedSelection = selectors.isSelectionCollapsed({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const focusTextBlock = selectors.getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })
  const focusSpan = selectors.getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: eventSelection,
    },
  })

  if (collapsedSelection && focusTextBlock && focusSpan) {
    // Looks like we are dragging an empty span
    // Let's drag the entire block instead
    dragSelection = {
      anchor: utils.getBlockStartPoint(focusTextBlock),
      focus: utils.getBlockEndPoint(focusTextBlock),
    }
  }

  const selectedBlocks = selectors.getSelectedBlocks(snapshot)

  if (
    snapshot.context.selection &&
    selectors.isSelectionExpanded(snapshot) &&
    selectors.isOverlappingSelection(eventSelection)(snapshot) &&
    selectedBlocks.length > 1
  ) {
    const selectionStartBlock = selectors.getSelectionStartBlock(snapshot)
    const selectionEndBlock = selectors.getSelectionEndBlock(snapshot)

    if (selectionStartBlock && selectionEndBlock) {
      dragSelection = {
        anchor: utils.getBlockStartPoint(selectionStartBlock),
        focus: utils.getBlockEndPoint(selectionEndBlock),
      }
    }
  }

  return dragSelection
}
