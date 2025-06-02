import type {EditorSelection} from '../editor/editor-selection'
import {getIndexedSelection, isBackward} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockOffset} from '../types/block-offset'
import * as utils from '../utils'
import {
  blockOffsetToSpanSelectionPoint,
  spanSelectionPointToBlockOffset,
} from '../utils'
import {getNextInlineObject} from './selector.get-next-inline-object'
import {getPreviousInlineObject} from './selector.get-previous-inline-object'
import {getSelectionText} from './selector.get-selection-text'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'
import {isSelectionExpanded} from './selector.is-selection-expanded'
import {getFocusTextBlock} from './selectors'

/**
 * @public
 * Returns the selection of the of the word the caret is placed in.
 * Note: Only returns a word selection if the current selection is collapsed
 */
export const getCaretWordSelection: EditorSelector<EditorSelection> = (
  snapshot,
) => {
  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return null
  }

  if (!isSelectionCollapsed(snapshot)) {
    return null
  }

  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = isBackward(indexedSelection)
    ? indexedSelection.focus
    : indexedSelection.anchor
  const selectionStartOffset = selectionStartPoint
    ? spanSelectionPointToBlockOffset({
        context: snapshot.context,
        selectionPoint: selectionStartPoint,
      })
    : undefined

  if (!focusTextBlock || !selectionStartPoint || !selectionStartOffset) {
    return null
  }

  const previousInlineObject = getPreviousInlineObject(snapshot)
  const blockStartPoint = utils.getBlockStartPoint({
    context: snapshot.context,
    block: focusTextBlock,
  })
  const textBefore = getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: previousInlineObject
          ? {
              path: [
                previousInlineObject.blockIndex,
                previousInlineObject.index,
              ],
              offset: 0,
            }
          : blockStartPoint,
        focus: selectionStartPoint,
      },
    },
  })
  const textDirectlyBefore = textBefore.split(/\s+/).at(-1)

  const nextInlineObject = getNextInlineObject(snapshot)
  const blockEndPoint = utils.getBlockEndPoint({
    context: snapshot.context,
    block: focusTextBlock,
  })
  const textAfter = getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: selectionStartPoint,
        focus: nextInlineObject
          ? {
              path: [nextInlineObject.blockIndex, nextInlineObject.index],
              offset: 0,
            }
          : blockEndPoint,
      },
    },
  })
  const textDirectlyAfter = textAfter.split(/\s+/).at(0)

  if (
    (textDirectlyBefore === undefined || textDirectlyBefore === '') &&
    (textDirectlyAfter === undefined || textDirectlyAfter === '')
  ) {
    return null
  }

  const caretWordStartOffset: BlockOffset = textDirectlyBefore
    ? {
        ...selectionStartOffset,
        offset: selectionStartOffset.offset - textDirectlyBefore.length,
      }
    : selectionStartOffset
  const caretWordEndOffset: BlockOffset = textDirectlyAfter
    ? {
        ...selectionStartOffset,
        offset: selectionStartOffset.offset + textDirectlyAfter.length,
      }
    : selectionStartOffset

  const caretWordStartSelectionPoint = blockOffsetToSpanSelectionPoint({
    context: snapshot.context,
    blockOffset: caretWordStartOffset,
    direction: 'backward',
  })
  const caretWordEndSelectionPoint = blockOffsetToSpanSelectionPoint({
    context: snapshot.context,
    blockOffset: caretWordEndOffset,
    direction: 'forward',
  })

  if (!caretWordStartSelectionPoint || !caretWordEndSelectionPoint) {
    return null
  }

  const caretWordSelection = {
    anchor: caretWordStartSelectionPoint,
    focus: caretWordEndSelectionPoint,
  }

  return isSelectionExpanded({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: caretWordSelection,
    },
  })
    ? caretWordSelection
    : null
}
